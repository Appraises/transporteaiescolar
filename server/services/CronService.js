const cron = require('node-cron');
const PollService = require('./PollService');
const ViagemController = require('../controllers/ViagemController');
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
    });
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
    });
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
    });
  }

  async schedularTurno(turnoNome, fallbackHoraEnquete, fallbackHoraFechamento) {
    // Busca do SQLite se houver override do painel Config
    const dbConfigEnquete = await Config.findOne({ where: { chave: `cron_enquete_${turnoNome}` } });
    const dbConfigFechamento = await Config.findOne({ where: { chave: `cron_fechamento_${turnoNome}` } });

    const horaEnquete = dbConfigEnquete ? dbConfigEnquete.valor : fallbackHoraEnquete;
    const horaFechamento = dbConfigFechamento ? dbConfigFechamento.valor : fallbackHoraFechamento;

    // Destrói agendamentos velhos se existirem (Reload de Config)
    if(activeJobs[`${turnoNome}_enquete`]) activeJobs[`${turnoNome}_enquete`].stop();
    if(activeJobs[`${turnoNome}_fechamento`]) activeJobs[`${turnoNome}_fechamento`].stop();

    // 1. Agendamento do Disparo da Enquete
    const [hhE, mmE] = horaEnquete.split(':');
    const cronEnquete = `${mmE} ${hhE} * * 1-5`; // Seg a Sexta
    
    activeJobs[`${turnoNome}_enquete`] = cron.schedule(cronEnquete, () => {
      console.log(`[Cron] Acionando Enquete de ${turnoNome}`);
      PollService.dispararEnquete(turnoNome);
      // Aqui idealmente também criariamos a row "Viagem" no banco com status 'aberta'
    });

    // 2. Agendamento do Fechamento e Envio Pro Motorista
    const [hhF, mmF] = horaFechamento.split(':');
    const cronFechamento = `${mmF} ${hhF} * * 1-5`; // Seg a Sexta

    activeJobs[`${turnoNome}_fechamento`] = cron.schedule(cronFechamento, () => {
      console.log(`[Cron] Fechando Rota de ${turnoNome} e enviando para Caminho Ótimo...`);
      // O mock da rota. Em produção, passaremos o turno e buscaremos quem de fato votou
      // Utilizando um Req Modificado Mock apenas para preencher o controller 
      const mockReq = { body: { turno: turnoNome, motoristaId: 1 } };
      const mockRes = { status: () => ({ json: (data) => console.log('Rota despachada', data) }) };
      ViagemController.calcularRotaOtima(mockReq, mockRes);
    });

    console.log(`[CronService] Turno ${turnoNome} -> Poll: ${horaEnquete} | Fechamento: ${horaFechamento}`);
  }

}

module.exports = new CronService();
