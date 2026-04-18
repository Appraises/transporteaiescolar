const WebhookQueueService = require('../services/WebhookQueueService');
const ReceiptParserService = require('../services/ReceiptParserService');
const EvolutionService = require('../services/EvolutionService');
const Passageiro = require('../models/Passageiro');
const Financeiro = require('../models/Financeiro');
const Motorista = require('../models/Motorista');
const GrupoMotorista = require('../models/GrupoMotorista');
const MessageVariation = require('../utils/MessageVariation');

class WebhookController {
  
  async handleEvolutionAPI(req, res) {
    // A Evolution envia payloads de vários eventos. Estamos interessados primeiramente
    // em 'messages.upsert' que indica que uma nova mensagem chegou.
    const body = req.body;
    
    if (!body) {
      return res.status(400).send('Payload vazio');
    }

    const event = body.event;
    
    // Responde logo ao webhook (200 OK) para não prender a resposta da API (que poderia dar timeout).
    // O processamento real ficará na fila em memória assíncrona.
    res.status(200).send({ status: 'received' });

    if (event === 'messages.upsert') {
      const data = body.data;
      console.log("[DEBUG] Webhook data recebido:", JSON.stringify(data).substring(0, 200));
      if (!data) return;

      const remoteJid = data.key?.remoteJid;
      const participant = data.key?.participant || remoteJid; // For groups, sender is participant
      const isFromMe = data.key?.fromMe;
      const isGroup = remoteJid?.endsWith('@g.us');
      const textMessage = data.message?.conversation || data.message?.extendedTextMessage?.text || '';

      if (isFromMe || !remoteJid) return;

      console.log(`[Webhook] Mensagem recebida de ${remoteJid}`);
      
      // 1. Tratativa de Arquivos e Fotos (Para Comprovantes)
      const msgType = data.message ? Object.keys(data.message)[0] : null;
      if (msgType === 'imageMessage' || msgType === 'documentMessage') {
          const mType = data.message[msgType];
          const hasBase64 = data.base64; // Evolution injeta na raiz `data.base64` se setado no webhook true
          
          if(hasBase64) {
            console.log(`[Financeiro] Analisando Mídia Multimodal de ${remoteJid}...`);
            const analise = await ReceiptParserService.validarComprovante(hasBase64, msgType === 'imageMessage' ? 'image/jpeg' : 'application/pdf');
            
            if (analise.isReceipt) {
               // Achar Passageiro
               const passageiro = await Passageiro.findOne({ where: { telefone: remoteJid } });
               if (passageiro) {
                  const fin = await Financeiro.findOne({ where: { passageiro_id: passageiro.id, status_pagamento: 'pendente' } });
                  if (fin) {
                     if (analise.value >= fin.valor_mensalidade && analise.fraudScore < 30) {
                        fin.status_pagamento = 'pago';
                        await fin.save();
                        EvolutionService.sendMessage(remoteJid, MessageVariation.financeiro.sucesso(passageiro.nome));
                      } else {
                         // Caso duvidoso pedido pelo cliente: Redireciona pro WhatsApp do Motorista
                         const motorista = await Motorista.findByPk(passageiro.motorista_id);
                         if (motorista) {
                            const texto = `⚠️ *Alerta Financeiro de ${passageiro.nome}*\nO valor cobrado era R$ ${fin.valor_mensalidade}, mas o PIX parece ter sido de R$ ${analise.value}.\nDetalhe IA: ${analise.details}\n\nVocê autoriza dar baixa nesse comprovante? Refuse ou Ajuste pelo painel!`;
                            EvolutionService.sendMessage(motorista.telefone, texto);
                         }
                         EvolutionService.sendMessage(remoteJid, MessageVariation.financeiro.falha(passageiro.nome));
                      }
                  } else {
                    EvolutionService.sendMessage(remoteJid, '🤔 Você não possui mensalidades pendentes cadastradas no meu sistema atual.');
                  }
               }
            }
            return; // Bloqueia o arquivo de ir pro buffer do LLM text-only
          }
      }

      if (!isGroup) {
          const m = await Motorista.findOne({ where: { telefone: remoteJid, status: 'ativo' }});
          if (m) {
             // A0. Comando Garagem (Base da Rota)
             if (textMessage.toLowerCase().startsWith('garagem ')) {
                 const GeocodeService = require('../services/GeocodeService');
                 const enderecoBase = textMessage.substring(8).trim();
                 
                 EvolutionService.sendMessage(remoteJid, `📍 Processando coordenadas da garagem...`);
                 
                 const coords = await GeocodeService.getCoordinates(enderecoBase);
                 if (coords) {
                     m.latitude = coords.lat;
                     m.longitude = coords.lng;
                     await m.save();
                     EvolutionService.sendMessage(remoteJid, `✅ Garagem registrada nas coordenadas detectadas!\nA partir de agora usarei essa base para montar suas rotas.`);
                 } else {
                     EvolutionService.sendMessage(remoteJid, `⚠️ Não consegui achar o endereço no mapa. Mande algo mais completo. Exemplo:\ngaragem Rua XYZ, 110, Bairro - Cidade`);
                 }
                 return;
             }

             // A. Lotação
             if (textMessage.toLowerCase().startsWith('lotacao ')) {
                 const parts = textMessage.toLowerCase().split(' ');
                 if(parts.length === 3) {
                     const turno = parts[1].replace('ã', 'a'); // manha, tarde, noite
                     const valor = parseInt(parts[2]);
                     let alterado = false;
                     if(turno === 'manha') { m.meta_manha = valor; alterado=true; }
                     if(turno === 'tarde') { m.meta_tarde = valor; alterado=true; }
                     if(turno === 'noite') { m.meta_noite = valor; alterado=true; }
                     
                     if (alterado) {
                        await m.save();
                        EvolutionService.sendMessage(remoteJid, `✅ Capacidade do turno ${turno.toUpperCase()} definida para ${valor} alunos! Vou te avisar conforme eles forem entrando no sistema.`);
                     } else {
                        EvolutionService.sendMessage(remoteJid, `⚠️ Turno inválido. Escreva: lotacao manha 15, lotacao tarde 10...`);
                     }
                     return;
                 }
             }

             // B. Lançamento de Gastos / Despesas (via LLM)
             const LlmService = require('../services/LlmService');
             const Despesa = require('../models/Despesa');
             const { Op } = require('sequelize');

             const despesaDetectada = await LlmService.parseExpense(textMessage);
             if (despesaDetectada && despesaDetectada.isExpense) {
                console.log(`[Financeiro] Gasto detectado de motorista ${m.id}:`, despesaDetectada);
                
                // Salva a despesa
                await Despesa.create({
                   motorista_id: m.id,
                   categoria: despesaDetectada.categoria || 'outros',
                   valor: despesaDetectada.valor,
                   descricao: despesaDetectada.descricao || textMessage
                });

                // Calcula o total gasto do mês para retornar no feedback
                const inicioMes = new Date();
                inicioMes.setDate(1);
                inicioMes.setHours(0,0,0,0);
                const fimMes = new Date();
                fimMes.setMonth(fimMes.getMonth() + 1);
                fimMes.setDate(0);
                fimMes.setHours(23,59,59,999);

                const gastosMes = await Despesa.findAll({
                   where: {
                      motorista_id: m.id,
                      data: {
                         [Op.between]: [inicioMes, fimMes]
                      }
                   }
                });
                
                const totalMes = gastosMes.reduce((acc, curr) => acc + curr.valor, 0);

                const msgConfirmacao = MessageVariation.despesas.confirmacao(despesaDetectada.categoria, despesaDetectada.valor, totalMes);
                await EvolutionService.sendMessage(remoteJid, msgConfirmacao);
                return; // Bloqueia de ir pra fila genérica do bot
             }
          }
      }

      // 2. Comandos de Grupo (Mapeamento Multi-Tenant original de '/cadastro' pode ser ignorado ou removido, mantido como fallback por enquanto)
      if (isGroup) {
         if (textMessage.toLowerCase().trim() === '/cadastro') {
            const grupo = await GrupoMotorista.findOne({ where: { group_jid: remoteJid } });
            if (grupo) {
               console.log(`[Onboarding] Iniciando cadastro de ${participant} no grupo ${grupo.id}`);
               const [pass, created] = await Passageiro.findOrCreate({ 
                  where: { telefone_responsavel: participant },
                  defaults: {
                     nome: 'Aguardando',
                     telefone_responsavel: participant,
                     motorista_id: grupo.motorista_id,
                     grupo_id: remoteJid,
                     onboarding_step: 'AGUARDANDO_NOME'
                  }
               });
               
               if (created || pass.onboarding_step !== 'CONCLUIDO') {
                  EvolutionService.sendMessage(participant, "👋 Olá! Vi sua requisição!\n*1. Qual o nome completo do aluno que irá na Van?*");
               } else {
                  EvolutionService.sendMessage(participant, "Você já está com o cadastro concluído no sistema da van!");
               }
            }
         }
         return; // Don't process other group texts via NLP/Queue
      }

      // 3. Fila Privada (Chatbot de Onboarding)
      let passageiro = await Passageiro.findOne({ where: { telefone_responsavel: remoteJid } });

      // -> Link Mágico: Captura "VAN <motoristaId>" vindo do link wa.me clicável
      const vanMatch = textMessage.toUpperCase().trim().match(/^VAN\s+(\d+)$/);
      if (!passageiro && vanMatch) {
          const motoristaId = parseInt(vanMatch[1]);
          const motoristaAlvo = await Motorista.findOne({ where: { id: motoristaId, status: 'ativo' } });

          if (!motoristaAlvo) {
              EvolutionService.sendMessage(remoteJid, `⚠️ Código de van inválido ou expirado. Peça ao motorista para reenviar o link no grupo.`);
              return;
          }

          passageiro = await Passageiro.create({
              nome: 'Aguardando',
              telefone_responsavel: remoteJid,
              onboarding_step: 'AGUARDANDO_NOME',
              motorista_id: motoristaAlvo.id
          });
          console.log(`[Onboarding] Passageiro ${remoteJid} vinculado ao motorista ${motoristaAlvo.nome} (ID ${motoristaAlvo.id}) via Link Mágico.`);
          EvolutionService.sendMessage(remoteJid, `👋 Olá! Bem-vindo(a) ao Assistente da Van do(a) *${motoristaAlvo.nome}*!\nVamos configurar a vaga do passageiro rapidinho.\n\n*1. Qual o nome completo do aluno que irá na Van?*`);
          return;
      }

      if (passageiro && passageiro.onboarding_step !== 'CONCLUIDO') {
          const passo = passageiro.onboarding_step;
          console.log(`[Onboarding] Pessoas ${remoteJid} respondeu passo: ${passo}`);

          if (passo === 'AGUARDANDO_NOME') {
              passageiro.nome = textMessage;
              passageiro.onboarding_step = 'AGUARDANDO_TURNO';
              await passageiro.save();
              EvolutionService.sendMessage(remoteJid, `Perfeito! Aluno registrado: ${textMessage}.\n\n*2. Qual o turno que esse aluno estudará?*\n(Ex: Manhã, Tarde, Noite, Integral)`);
              return;
          }
          if (passo === 'AGUARDANDO_TURNO') {
              passageiro.turno = textMessage;
              passageiro.onboarding_step = 'AGUARDANDO_ENDERECO';
              await passageiro.save();
              EvolutionService.sendMessage(remoteJid, `Ok, Turno ${textMessage}.\n\n*3. Agora preciso dos endereços de embarque.*\n\nSe o aluno embarca sempre no mesmo lugar, mande *um* endereço.\nSe ele tem mais de um local (ex: casa da mãe e casa do pai), mande *um por linha*, começando com um apelido:\n\nExemplo:\nCasa da Mãe - Rua das Flores, 123, Centro\nCasa do Pai - Av. Brasil, 456, Jardim América\n\n📝 Mande todos agora numa mensagem só:`);
              return;
          }
          if (passo === 'AGUARDANDO_ENDERECO') {
              const Endereco = require('../models/Endereco');
              const GeocodeService = require('../services/GeocodeService');
              const linhas = textMessage.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              
              let countCadastrados = 0;
              let primeiroEnderecoId = null;

              for (let i = 0; i < linhas.length; i++) {
                 const linha = linhas[i];
                 let apelido = `Endereço ${i + 1}`;
                 let enderecoCompleto = linha;

                 // Tenta separar por '-' ou ':'
                 const match = linha.match(/^([^-:]+)[-:]\s*(.*)$/);
                 if (match) {
                    apelido = match[1].trim();
                    enderecoCompleto = match[2].trim();
                 }

                 let latitude = null;
                 let longitude = null;
                 try {
                     const coords = await GeocodeService.getCoordinates(enderecoCompleto);
                     if (coords) {
                         latitude = coords.lat;
                         longitude = coords.lng;
                     }
                 } catch (geoErr) {
                     console.error('[Geocode] Erro na busca de coordenadas:', geoErr);
                 }

                 const novoEndereco = await Endereco.create({
                    passageiro_id: passageiro.id,
                    apelido: apelido,
                    endereco_completo: enderecoCompleto,
                    latitude,
                    longitude
                 });

                 if (i === 0) {
                    primeiroEnderecoId = novoEndereco.id;
                 }
                 countCadastrados++;
              }

              passageiro.endereco_ida_id = primeiroEnderecoId;
              passageiro.endereco_volta_id = primeiroEnderecoId;
              passageiro.onboarding_step = 'CONCLUIDO';
              await passageiro.save();
              
              const msgConfirm = MessageVariation.enderecos.confirmacao(countCadastrados);
              EvolutionService.sendMessage(remoteJid, msgConfirm);
              
              // Notificacao de Meta para o Motorista Responsável
              const motorista_resp = await Motorista.findByPk(passageiro.motorista_id);
              if (motorista_resp) {
                  const counts = await Passageiro.count({ where: { motorista_id: motorista_resp.id, turno: passageiro.turno, onboarding_step: 'CONCLUIDO' } });
                  
                  let meta = 0;
                  const tStr = (passageiro.turno || '').toLowerCase().trim();
                  if (tStr.includes('manhã') || tStr.includes('manha')) meta = motorista_resp.meta_manha;
                  else if (tStr.includes('tarde')) meta = motorista_resp.meta_tarde;
                  else if (tStr.includes('noite')) meta = motorista_resp.meta_noite;
                  
                  let textMeta = '';
                  if (meta > 0) {
                      if (counts >= meta) textMeta = `(LOTAÇÃO COMPLETA! 🎉 A van encheu!)`;
                      else textMeta = `(Faltam ${meta - counts} alunos para fechar a lista desse turno!)`;
                  }
                  
                  const notifyText = `🔔 *Novo Aluno a Bordo!*\n\nO(A) responsável/aluno *${passageiro.nome}* concluiu o auto-cadastro para o turno *${passageiro.turno}*.\n\n📊 *Resumo do Turno:* Você tem ${counts} confirmados.\n${textMeta}`;
                  EvolutionService.sendMessage(motorista_resp.telefone, notifyText);
              }

              return;
          }
      } else if (passageiro && passageiro.onboarding_step === 'CONCLUIDO') {
          // 4. Interceptação de Troca de Endereço Ativo
          const Endereco = require('../models/Endereco');
          const LlmService = require('../services/LlmService');
          
          const enderecosDisponiveis = await Endereco.findAll({ where: { passageiro_id: passageiro.id } });
          
          if (enderecosDisponiveis.length > 0) {
              const switchDetectado = await LlmService.parseAddressSwitch(textMessage, enderecosDisponiveis);
              
              if (switchDetectado && switchDetectado.isSwitch) {
                  const enderecoEscolhido = enderecosDisponiveis.find(e => e.apelido === switchDetectado.apelido);
                  
                  if (enderecoEscolhido) {
                      let trechoTxt = 'ida e volta';
                      if (switchDetectado.trecho === 'ida' || switchDetectado.trecho === 'ambos') {
                          passageiro.endereco_ida_id = enderecoEscolhido.id;
                          if (switchDetectado.trecho === 'ida') trechoTxt = 'ida';
                      }
                      if (switchDetectado.trecho === 'volta' || switchDetectado.trecho === 'ambos') {
                          passageiro.endereco_volta_id = enderecoEscolhido.id;
                          if (switchDetectado.trecho === 'volta') trechoTxt = 'volta';
                      }
                      
                      await passageiro.save();
                      EvolutionService.sendMessage(remoteJid, MessageVariation.enderecos.troca(trechoTxt, enderecoEscolhido.apelido));
                      return; // Impede que vá pra fila genérica
                  }
              }
          }
      }

      // Enfileira a mensagem normal de texto na v2.
      WebhookQueueService.enqueue(remoteJid, data);
    }
    
    // Captura de Votos da Enquete
    if (event === 'messages.update') {
      const data = body.data;
      if (!data) return;

      // Baileys/Evolution V2: updates em poll message vem geralmente aqui
      // Como na documentação especifica pode variar as chaves, vamos logar para o Motorista
      // e simular a chamada nativa de "Votou na Enquete"
      try {
        const updateInfo = typeof data === 'object' && !Array.isArray(data) ? data : data[0]; 
        if (updateInfo && updateInfo.update && updateInfo.update.pollUpdates) {
           const voterJid = updateInfo.key.participant || updateInfo.key.remoteJid;
           console.log(`[Webhook] Recebeu Polling Update (Voto) de ${voterJid}`);
           // Puxa passageiro e salva o voto na memória/DB
           // Para a Fase de Produção, atrelamos VoterJID com Passegeiros.
        } else {
           // Fallback Logging genérico de Update
           console.log(`[Webhook] Outro tipo de Message Update recebido. Ignorando...`);
        }
      } catch(e) {
         console.warn('[Webhook] Falha ao ler PollUpdate', e.message);
      }
    }

    // 4. Interceptação de Grupo Multi-Tenant Add
    if (event === 'group-participants.update') {
       const groupData = body.data;
       if (!groupData) return;

       const { id: remoteJid, author, action, participants } = groupData;
       
       // Detect se ocorreu ação de Add
       if (action === 'add' && author) {
           console.log(`[Group Validation] Evento Add detectado no grupo ${remoteJid} pelo author ${author}`);
           
           // Checa se o usuário que disparou isso é nosso motorista pagante ativo
           const motorista = await Motorista.findOne({ where: { telefone: author, status: 'ativo' } });

           if (motorista) {
               // Valida se o grupo já tá rastreado, senão cria e avisa!
               const [grupo, created] = await GrupoMotorista.findOrCreate({ 
                   where: { group_jid: remoteJid },
                   defaults: { motorista_id: motorista.id, group_jid: remoteJid }
               });
               if (created) {
                   const botPhone = process.env.BOT_PHONE_NUMBER || '5511999999999';
                   const linkMagico = `https://wa.me/${botPhone}?text=VAN%20${motorista.id}`;
                   EvolutionService.sendMessage(remoteJid, `🚙 *Olá pessoal! Sou o assistente virtual da Van do(a) ${motorista.nome}.*\n\nPara organizarmos as rotas diárias com inteligência artificial, cliquem no link abaixo para iniciar o cadastro no meu privado:\n\n👉 ${linkMagico}\n\nLá irei pedir Nome, Turno e Endereços rapidinho!`);
               }
           } else {
               // Autor que adicionou não é motorista e/ou não tá ativo. Vamos sair se não tivermos esse grupo rodando.
               const grupoConhecido = await GrupoMotorista.findOne({ where: { group_jid: remoteJid }});
               if (!grupoConhecido) {
                   console.log(`[Group Validation] Adicionado em grupo pirata/anônimo por ${author}. Saindo!`);
                   EvolutionService.leaveGroup(remoteJid);
               }
           }
       }
    }
  }
}

module.exports = new WebhookController();
