const cron = require('node-cron');
const PollService = require('./PollService');
// ViagemController não é mais usado aqui - o fechamento gera rotas diretamente
const Config = require('../models/Config');
const AntiBanService = require('./AntiBanService');
const EvolutionService = require('./EvolutionService');
const Passageiro = require('../models/Passageiro');
const Financeiro = require('../models/Financeiro');

// Dicionário de Jobs na memória (para podermos destruí-los e recriá-los quando a UI mudar configs)
const activeJobs = {};

class CronService {
  
  async startCronJobs() {
    console.log('[CronService] Carregando Agendamentos...');
    await this.schedularTurno('manha', '05:00', '05:55');
    await this.schedularTurno('tarde', '11:00', '11:55');
    await this.schedularTurno('noite', '17:00', '17:55');
    
    // Liga o Robô Cobrador Diário as 08:00
    this.agendarCobrancasDiarias();
    
    // Liga o Relatório Mensal de Lucro
    this.agendarRelatorioMensal();
    
    // Liga o Lembrete de Endereço Alternativo
    this.agendarLembreteEnderecos();
    
    // Liga o Checador Pró-Ativo de Feriados Nacionais
    this.agendarAlertaFeriado();
    
    // Liga a Geração Automática de Mensalidades (dia 1 de cada mês)
    this.agendarGeracaoMensalidades();
  }

  agendarGeracaoMensalidades() {
    if(activeJobs['geracao_mensalidades']) activeJobs['geracao_mensalidades'].stop();
    
    // Roda todo dia 1 às 00:05
    activeJobs['geracao_mensalidades'] = cron.schedule('5 0 1 * *', async () => {
      console.log('[Cron] Gerando mensalidades do mês...');
      try {
        const { Op } = require('sequelize');
        const hoje = new Date();
        const mes = hoje.getMonth(); // 0-11
        const ano = hoje.getFullYear();
        
        // Vencimento no dia 10 do mês corrente
        const dataVencimento = new Date(ano, mes, 10).toISOString().split('T')[0];

        // Busca todos os passageiros ativos com mensalidade cadastrada
        const passageirosAtivos = await Passageiro.findAll({
          where: { 
            onboarding_step: 'CONCLUIDO',
            mensalidade: { [Op.gt]: 0 }
          }
        });

        let criados = 0;
        for (const p of passageirosAtivos) {
          // Verifica se já existe cobrança desse mês (evita duplicata)
          const jaExiste = await Financeiro.findOne({
            where: {
              passageiro_id: p.id,
              data_vencimento: {
                [Op.between]: [
                  new Date(ano, mes, 1).toISOString().split('T')[0],
                  new Date(ano, mes + 1, 0).toISOString().split('T')[0]
                ]
              }
            }
          });

          if (!jaExiste) {
            await Financeiro.create({
              passageiro_id: p.id,
              valor_mensalidade: p.mensalidade,
              data_vencimento: dataVencimento,
              status_pagamento: 'pendente'
            });
            criados++;
          }
        }

        console.log(`[Cron] ${criados} mensalidade(s) gerada(s) para ${passageirosAtivos.length} passageiro(s) ativo(s).`);
      } catch (e) {
        console.error('[Cron] Falha ao gerar mensalidades:', e);
      }
    }, { timezone: "America/Sao_Paulo" });
    console.log('[CronService] Geração automática de mensalidades agendada (dia 1, 00:05).');
  }

  agendarAlertaFeriado() {
    if(activeJobs['alerta_feriado']) activeJobs['alerta_feriado'].stop();
    
    // Roda todo dia as 18:00 verificando o dia de amanhã
    activeJobs['alerta_feriado'] = cron.schedule('0 18 * * *', async () => {
       console.log('[Cron] Verificando feriados do dia seguinte...');
       try {
           const Holidays = require('date-holidays');
           const hd = new Holidays('BR');
           
           const dataAmanha = new Date();
           dataAmanha.setDate(dataAmanha.getDate() + 1);
           const amanhaStr = dataAmanha.toISOString().split('T')[0];
           
           // isHoliday retorna array com os feriados do dia, ou false
           const feriadosHoje = hd.isHoliday(dataAmanha);
           
           if (!feriadosHoje) return;

           const nomeFeriado = feriadosHoje[0].name;
           
           const { Motorista } = require('../models');
           const MessageVariation = require('../utils/MessageVariation');
           const motoristasAtivos = await Motorista.findAll({ where: { status: 'ativo' } });

           for (const m of motoristasAtivos) {
               // Verifica se o motorista já tá de férias ou se já pausou amanhã
               if (m.em_ferias) continue;
               
               let jaPausouAmanha = false;
               if (m.pausa_inicio && m.pausa_fim) {
                   if (amanhaStr >= m.pausa_inicio && amanhaStr <= m.pausa_fim) {
                       jaPausouAmanha = true;
                   }
               }

               if (!jaPausouAmanha) {
                   const msgH = MessageVariation.pausas.feriadoProativo(nomeFeriado, amanhaStr.split('-').reverse().join('/'));
                   await EvolutionService.sendMessage(m.telefone, msgH);
                   // O motorista pode responder com o flow nativo (NLP pegará "amanhã é feriado")
               }
           }
       } catch (e) {
           console.error('[Cron] Falha ao rodar checagem proativa de feriados', e);
       }
    }, { timezone: "America/Sao_Paulo" });
  }

  agendarLembreteEnderecos() {
    if(activeJobs['lembrete_endereco']) activeJobs['lembrete_endereco'].stop();
    
    // Roda todo dia às 06:30 da manhã (antes do primeiro turno)
    activeJobs['lembrete_endereco'] = cron.schedule('30 6 * * 1-5', async () => {
       console.log('[Cron] Verificando alunos com endereço alternativo ativo...');
       try {
           const Endereco = require('../models/Endereco');
           const MessageVariation = require('../utils/MessageVariation');
           
           const passageiros = await Passageiro.findAll({
              where: { onboarding_step: 'CONCLUIDO' }
           });

           for (const p of passageiros) {
               // Pega o endereço primário (primeiro cadastrado)
               const enderecoPrimario = await Endereco.findOne({
                   where: { passageiro_id: p.id },
                   order: [['id', 'ASC']]
               });

               if (!enderecoPrimario) continue;

               const idaAlterada = p.endereco_ida_id && p.endereco_ida_id !== enderecoPrimario.id;
               const voltaAlterada = p.endereco_volta_id && p.endereco_volta_id !== enderecoPrimario.id;

               if (idaAlterada || voltaAlterada) {
                   let enderecoIdaAtual = null;
                   let enderecoVoltaAtual = null;

                   if (idaAlterada) {
                       enderecoIdaAtual = await Endereco.findByPk(p.endereco_ida_id);
                   }
                   if (voltaAlterada) {
                       enderecoVoltaAtual = await Endereco.findByPk(p.endereco_volta_id);
                   }

                   const msg = MessageVariation.enderecos.lembreteAlternativo(
                       p.nome, enderecoPrimario.apelido,
                       idaAlterada ? enderecoIdaAtual?.apelido : null,
                       voltaAlterada ? enderecoVoltaAtual?.apelido : null
                   );
                   
                   const telefone = p.telefone_responsavel || p.telefone;
                   if (telefone) {
                       await EvolutionService.sendMessage(telefone, msg);
                   }
               }
           }
       } catch (e) {
           console.error('[Cron] Falha ao enviar lembretes de endereço:', e);
       }
    }, { timezone: "America/Sao_Paulo" });
  }

  agendarRelatorioMensal() {
    if(activeJobs['relatorio_mensal']) activeJobs['relatorio_mensal'].stop();
    
    // Roda todo dia 28 ao 31 as 20:00 (vai verificar dentro se é o ultimo dia do mês)
    activeJobs['relatorio_mensal'] = cron.schedule('0 20 28-31 * *', async () => {
       const hoje = new Date();
       const amanha = new Date(hoje);
       amanha.setDate(hoje.getDate() + 1);
       
       // Só executa de fato se amanhã for dia 1 (ou seja, hoje é o último dia do mês)
       if (amanha.getDate() !== 1) return;

       console.log('[Cron] Rodando Relatório Mensal de Lucro dos Motoristas...');
       try {
           const { Motorista, Despesa } = require('../models');
           const { Op } = require('sequelize');
           const MessageVariation = require('../utils/MessageVariation');
           
           const motoristas = await Motorista.findAll({ where: { status: 'ativo' } });
           
           const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0);
           const fimMes = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
           
           const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
           const nomeMes = nomesMeses[hoje.getMonth()];

           for (const m of motoristas) {
               // 1. Calcular Receita (Mensalidades pagas desse motorista)
               // Como Financeiro aponta pra Passageiro, precisamos fazer join
               const passageirosDoMotorista = await Passageiro.findAll({ where: { motorista_id: m.id } });
               const passageiroIds = passageirosDoMotorista.map(p => p.id);
               
               let receitaTotal = 0;
               if (passageiroIds.length > 0) {
                   const recebimentos = await Financeiro.findAll({
                       where: {
                           passageiro_id: { [Op.in]: passageiroIds },
                           status_pagamento: 'pago',
                           updatedAt: { [Op.between]: [inicioMes, fimMes] } // Idealmente seria data_pagamento, usando updatedAt por simplicidade no momento
                       }
                   });
                   receitaTotal = recebimentos.reduce((acc, curr) => acc + curr.valor_mensalidade, 0);
               }

               // 2. Calcular Despesas
               const despesas = await Despesa.findAll({
                   where: {
                       motorista_id: m.id,
                       data: { [Op.between]: [inicioMes, fimMes] }
                   }
               });
               const despesaTotal = despesas.reduce((acc, curr) => acc + curr.valor, 0);

               // 3. Lucro Líquido
               const lucro = receitaTotal - despesaTotal;

               // Enviar Relatório
               const msgRelatorio = MessageVariation.despesas.relatorio(m.nome, nomeMes, receitaTotal, despesaTotal, lucro);
               await EvolutionService.sendMessage(m.telefone, msgRelatorio);
           }
       } catch (e) {
           console.error('[Cron] Falha ao gerar relatório mensal:', e);
       }
    }, { timezone: "America/Sao_Paulo" });
  }

  agendarCobrancasDiarias() {
    if(activeJobs['cobranca_diaria']) activeJobs['cobranca_diaria'].stop();
    
    // Roda todo dia as 08:00 da manhã
    activeJobs['cobranca_diaria'] = cron.schedule('0 8 * * *', async () => {
      console.log('[Cron] Rodando Robô Financeiro Anti-Ban...');
      try {
         const pendentes = await Financeiro.findAll({ where: { status_pagamento: 'pendente' } });
         for (const reqFin of pendentes) {
            const pass = await Passageiro.findByPk(reqFin.passageiro_id);
            if (pass && pass.telefone) {
               // Envia o lembrete humanizado pro usuário usando Zero-Widths e sinonimos
               const msg = AntiBanService.gerarCobrancaHumanizada(pass.nome, reqFin.valor_mensalidade);
               await EvolutionService.sendMessage(pass.telefone, msg);
            }
         }
      } catch (e) {
        console.error('[Cron] Falha ao enviar cobrancas:', e);
      }
    }, { timezone: "America/Sao_Paulo" });
  }

  _horaAtualSaoPaulo() {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
  }

  _dataAtualSaoPaulo() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const get = (type) => parts.find(part => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  async _getConfigValue(chave, motoristaId, fallback) {
    const configMotorista = await Config.findOne({ where: { chave, motorista_id: motoristaId } });
    if (configMotorista?.valor) return configMotorista.valor;

    const configGlobal = await Config.findOne({ where: { chave, motorista_id: null } });
    return configGlobal?.valor || fallback;
  }

  async _getTurnoConfig(motoristaId, turnoNome, fallbackHoraEnquete, fallbackHoraFechamento) {
    const horaEnquete = await this._getConfigValue(`cron_enquete_${turnoNome}`, motoristaId, fallbackHoraEnquete);
    const horaFechamento = await this._getConfigValue(`cron_fechamento_${turnoNome}`, motoristaId, fallbackHoraFechamento);
    return { horaEnquete, horaFechamento };
  }

  async schedularTurno(turnoNome, fallbackHoraEnquete, fallbackHoraFechamento) {
    // Destrói agendamentos velhos se existirem (Reload de Config)
    if(activeJobs[`${turnoNome}_enquete`]) activeJobs[`${turnoNome}_enquete`].stop();
    if(activeJobs[`${turnoNome}_fechamento`]) activeJobs[`${turnoNome}_fechamento`].stop();

    // 1. Agendamento do Disparo da Enquete
    const cronEnquete = '* * * * 1-5'; // Seg a Sexta, decide por motorista no callback
    
    activeJobs[`${turnoNome}_enquete`] = cron.schedule(cronEnquete, async () => {
      const horaAtual = this._horaAtualSaoPaulo();
      
      const { Motorista, GrupoMotorista, PollDispatch } = require('../models');
      const hojeStr = this._dataAtualSaoPaulo();

      // Busca grupos e depois encontra o motorista
      const grupos = await GrupoMotorista.findAll();

      for (const grupo of grupos) {
         const m = await Motorista.findOne({ where: { id: grupo.motorista_id, status: 'ativo' }});
         if (!m) continue;

         const { horaEnquete } = await this._getTurnoConfig(m.id, turnoNome, fallbackHoraEnquete, fallbackHoraFechamento);
         if (horaEnquete !== horaAtual) continue;
         
         // Regra 1: Férias indefinidas
         if (m.em_ferias) {
             console.log(`[Cron] Motorista ${m.nome} em férias. Enquete pulada.`);
             continue;
         }
         
         // Regra 2: Pausas temporárias (feriados / recesso)
         if (m.pausa_inicio && m.pausa_fim) {
             if (hojeStr >= m.pausa_inicio && hojeStr <= m.pausa_fim) {
                 console.log(`[Cron] Motorista ${m.nome} em recesso (Feriado). Enquete pulada.`);
                 continue;
             }
         }

         const grupoLabel = grupo.nome_grupo
            ? `${grupo.nome_grupo} (${grupo.group_jid})`
            : grupo.group_jid;

         let dispatch;
         try {
            dispatch = await PollDispatch.create({
               data: hojeStr,
               turno: turnoNome,
               motorista_id: m.id,
               group_jid: grupo.group_jid,
               status: 'enviando'
            });
         } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
               console.log(`[Cron] Enquete de ${turnoNome} ja registrada hoje para ${m.nome} no grupo ${grupoLabel}. Pulando duplicata.`);
               continue;
            }
            throw err;
         }

         console.log(`[Cron] Acionando Enquete de ${turnoNome} para ${m.nome} no grupo ${grupoLabel} (${horaAtual})`);
         const enviada = await PollService.dispararEnquete(turnoNome, grupo.group_jid);
         dispatch.status = enviada ? 'enviada' : 'erro';
         dispatch.erro = enviada ? null : 'PollService retornou false';
         await dispatch.save();
      }
    }, { timezone: "America/Sao_Paulo" });

    // 2. Agendamento do Fechamento e Envio Pro Motorista
    const cronFechamento = '* * * * 1-5'; // Seg a Sexta, decide por motorista no callback

    activeJobs[`${turnoNome}_fechamento`] = cron.schedule(cronFechamento, async () => {
      try {
        const { Motorista, Viagem, ViagemPassageiro, Passageiro, Endereco } = require('../models');
        const { Op } = require('sequelize');
        const horaAtual = this._horaAtualSaoPaulo();
        const hojeStr = new Date().toISOString().split('T')[0];
        const motoristasAtivos = await Motorista.findAll({ where: { status: 'ativo' } });
        const motoristasNoHorario = [];

        for (const motorista of motoristasAtivos) {
          const { horaFechamento } = await this._getTurnoConfig(motorista.id, turnoNome, fallbackHoraEnquete, fallbackHoraFechamento);
          if (horaFechamento === horaAtual) {
            motoristasNoHorario.push(motorista.id);
          }
        }

        if (motoristasNoHorario.length === 0) return;

        console.log(`[Cron] Fechando Rota de ${turnoNome} para ${motoristasNoHorario.length} motorista(s) no horario ${horaAtual}...`);

        // Busca todas as viagens de hoje para esse turno
        const viagensHoje = await Viagem.findAll({
          where: {
            data: hojeStr,
            turno: turnoNome,
            status: 'pendente',
            motorista_id: { [Op.in]: motoristasNoHorario }
          }
        });

        if (viagensHoje.length === 0) {
          console.log(`[Cron] Nenhuma viagem pendente encontrada para ${turnoNome} hoje.`);
          return;
        }

        for (const viagem of viagensHoje) {
          const motorista = await Motorista.findByPk(viagem.motorista_id);
          if (!motorista) continue;

          const coordsBase = {
            lat: motorista.latitude || -23.550520,
            lng: motorista.longitude || -46.633308
          };

          // Busca todos os registros de ViagemPassageiro com seus Passageiros
          const registrosVoto = await ViagemPassageiro.findAll({
            where: { viagem_id: viagem.id },
            include: [{ 
              model: Passageiro, 
              include: [
                { model: Endereco, as: 'enderecoIda' },
                { model: Endereco, as: 'enderecoVolta' }
              ]
            }]
          });

          // Separa quem vai na ida e quem vai na volta
          const passageirosIda = registrosVoto
            .filter(r => r.status_ida === 'confirmado' && r.Passageiro)
            .map(r => {
              const p = r.Passageiro;
              const endIda = p.enderecoIda;
              return {
                ...p.toJSON(),
                latitude: endIda?.latitude || p.latitude,
                longitude: endIda?.longitude || p.longitude,
                enderecoFormatado: endIda?.endereco_completo || p.logradouro || p.bairro || 'Sem endereço',
                vp_id: r.id
              };
            })
            .filter(p => p.latitude && p.longitude);

          const passageirosVolta = registrosVoto
            .filter(r => r.status_volta === 'confirmado' && r.Passageiro)
            .map(r => {
              const p = r.Passageiro;
              const endVolta = p.enderecoVolta;
              return {
                ...p.toJSON(),
                latitude: endVolta?.latitude || p.latitude,
                longitude: endVolta?.longitude || p.longitude,
                enderecoFormatado: endVolta?.endereco_completo || p.logradouro || p.bairro || 'Sem endereço',
                vp_id: r.id
              };
            })
            .filter(p => p.latitude && p.longitude);

          const RoutingService = require('../services/RoutingService');
          const MessageVariation = require('../utils/MessageVariation');

          // Gera rota de IDA
          if (passageirosIda.length > 0 && !viagem.rota_ida_enviada) {
            const resultadoIda = RoutingService.calculateOptimalRoute(passageirosIda, coordsBase);
            
            // Monta a lista numerada dos passageiros
            let listaIda = '';
            resultadoIda.orderedPath.forEach((aluno, i) => {
              listaIda += `${i + 2}. ${aluno.nome} - 📍${aluno.enderecoFormatado}\n`;
            });

            const textIda = MessageVariation.logistica.rotaIda(turnoNome, passageirosIda.length, listaIda);

            // Salva a ordem na tabela pivô
            for (let i = 0; i < resultadoIda.orderedPath.length; i++) {
              const vpId = resultadoIda.orderedPath[i].vp_id;
              if (vpId) {
                await ViagemPassageiro.update({ ordem_rota: i + 1 }, { where: { id: vpId } });
              }
            }

            viagem.rota_ida_enviada = true;
            await viagem.save();
            const idaEnviada = await EvolutionService.sendMessage(motorista.telefone, textIda);
            if (!idaEnviada) {
              console.warn(`[Cron] Falha/retorno incerto ao enviar rota de IDA da viagem #${viagem.id}. Marcada como enviada para evitar duplicidade; verifique manualmente.`);
            }
          } else if (passageirosIda.length > 0) {
            console.log(`[Cron] Rota de IDA da viagem #${viagem.id} ja foi enviada. Pulando reenvio.`);
          }

          // Gera rota de VOLTA
          if (passageirosVolta.length > 0 && !viagem.rota_volta_enviada) {
            const resultadoVolta = RoutingService.calculateOptimalRoute(passageirosVolta, coordsBase);
            
            let listaVolta = '';
            resultadoVolta.orderedPath.forEach((aluno, i) => {
              listaVolta += `${i + 2}. ${aluno.nome} - 📍${aluno.enderecoFormatado}\n`;
            });

            const textVolta = MessageVariation.logistica.rotaVolta(turnoNome, passageirosVolta.length, listaVolta);
            viagem.rota_volta_enviada = true;
            await viagem.save();
            const voltaEnviada = await EvolutionService.sendMessage(motorista.telefone, textVolta);
            if (!voltaEnviada) {
              console.warn(`[Cron] Falha/retorno incerto ao enviar rota de VOLTA da viagem #${viagem.id}. Marcada como enviada para evitar duplicidade; verifique manualmente.`);
            }
          } else if (passageirosVolta.length > 0) {
            console.log(`[Cron] Rota de VOLTA da viagem #${viagem.id} ja foi enviada. Pulando reenvio.`);
          }

          // Se ninguém votou, avisa ao motorista
          if (passageirosIda.length === 0 && passageirosVolta.length === 0 && !viagem.turno_livre_enviado) {
            viagem.turno_livre_enviado = true;
            await viagem.save();
            const turnoLivreEnviado = await EvolutionService.sendMessage(motorista.telefone, MessageVariation.logistica.turnoLivre(turnoNome));
            if (!turnoLivreEnviado) {
              console.warn(`[Cron] Falha/retorno incerto ao enviar aviso de turno livre da viagem #${viagem.id}. Marcado como enviado para evitar duplicidade; verifique manualmente.`);
            }
          }

          // Atualiza status da viagem
          // A viagem so vira rota_gerada depois que todos os envios necessarios forem confirmados.

          // Pede ao motorista para compartilhar localização em tempo real
          if ((passageirosIda.length > 0 || passageirosVolta.length > 0) && !viagem.pedido_gps_enviado) {
            viagem.pedido_gps_enviado = true;
            await viagem.save();
            const gpsEnviado = await EvolutionService.sendMessage(motorista.telefone, MessageVariation.rastreamento.pedirLocalizacao());
            if (!gpsEnviado) {
              console.warn(`[Cron] Falha/retorno incerto ao enviar pedido de GPS da viagem #${viagem.id}. Marcado como enviado para evitar duplicidade; verifique manualmente.`);
            }
          }

          const precisaIda = passageirosIda.length > 0;
          const precisaVolta = passageirosVolta.length > 0;
          const rotasNecessariasEnviadas =
            (!precisaIda || viagem.rota_ida_enviada) &&
            (!precisaVolta || viagem.rota_volta_enviada);
          const gpsNecessarioEnviado =
            (passageirosIda.length === 0 && passageirosVolta.length === 0) || viagem.pedido_gps_enviado;
          const turnoLivreNecessarioEnviado =
            (passageirosIda.length > 0 || passageirosVolta.length > 0) || viagem.turno_livre_enviado;

          if (rotasNecessariasEnviadas && gpsNecessarioEnviado && turnoLivreNecessarioEnviado) {
            viagem.status = 'rota_gerada';
            await viagem.save();
            console.log(`[Cron] Rota gerada para motorista ${motorista.nome} (Viagem #${viagem.id})`);
          } else {
            console.warn(`[Cron] Fechamento da viagem #${viagem.id} ficou incompleto. Proximo retry nao reenviara trechos ja marcados como enviados.`);
          }
        }
      } catch (err) {
        console.error(`[Cron] Erro ao fechar rota de ${turnoNome}:`, err);
      }
    }, { timezone: "America/Sao_Paulo" });

    console.log(`[CronService] Turno ${turnoNome} -> jobs por minuto com defaults Poll: ${fallbackHoraEnquete} | Fechamento: ${fallbackHoraFechamento}`);
  }

}

module.exports = new CronService();
