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

      // 1.5. Configuração de Lotação via Zap (Apenas Motoristas Pagantes)
      if (!isGroup) {
          const m = await Motorista.findOne({ where: { telefone: remoteJid }});
          if (m && textMessage.toLowerCase().startsWith('lotacao ')) {
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
      }

      // 2. Comandos de Grupo (Mapeamento Multi-Tenant)
      if (isGroup) {
         if (textMessage.toLowerCase().trim() === '/cadastro') {
            const grupo = await GrupoMotorista.findOne({ where: { group_jid: remoteJid } });
            if (grupo) {
               console.log(`[Onboarding] Iniciando cadastro de ${participant} no grupo ${grupo.id}`);
               const [pass, created] = await Passageiro.findOrCreate({ 
                  where: { telefoneResponsavel: participant },
                  defaults: {
                     nome: 'Aguardando',
                     telefone_responsavel: participant,
                     motorista_id: grupo.motorista_id,
                     grupo_id: remoteJid,
                     onboarding_step: 'AGUARDANDO_NOME'
                  }
               });
               
               if (created || pass.onboarding_step !== 'CONCLUIDO') {
                  EvolutionService.sendMessage(participant, "👋 Olá! Vi sua requisição no grupo da Van!\nVamos configurar sua vaga Rapidinho.\n\n*1. Qual o nome completo do aluno que irá na Van?*");
               } else {
                  EvolutionService.sendMessage(participant, "Você já está com o cadastro concluído no sistema da van! Se precisar de algo, chame o motorista.");
               }
            }
         }
         return; // Don't process other group texts via NLP/Queue
      }

      // 3. Fila Privada (Chatbot de Onboarding)
      const passageiro = await Passageiro.findOne({ where: { telefone_responsavel: remoteJid } });
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
              EvolutionService.sendMessage(remoteJid, `Ok, Turno ${textMessage}.\n\n*3. Último passo: Qual o endereço completo para a rota?*\n(Ex: Rua das Flores, 123, Bairro Centro, CEP...)`);
              return;
          }
          if (passo === 'AGUARDANDO_ENDERECO') {
              passageiro.logradouro = textMessage; // Safely putting all string in logradouro for human review or Geocoding later
              passageiro.onboarding_step = 'CONCLUIDO';
              await passageiro.save();
              EvolutionService.sendMessage(remoteJid, `✅ *Tudo pronto!* O motorista já recebeu seus dados para adicionar na rota otimizada e o faturamento.\nMuito obrigado!`);
              
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
       
       // Detect if this is an "add" event.
       if (action === 'add' && author) {
           console.log(`[Group Validation] Evento Add detectado no grupo ${remoteJid} pelo author ${author}`);
           // Checks if the user who requested the addition is a paying Motorista
           const motorista = await Motorista.findOne({ where: { telefone: author } });

           if (motorista) {
               const [grupo, created] = await GrupoMotorista.findOrCreate({ 
                   where: { group_jid: remoteJid },
                   defaults: { motorista_id: motorista.id, group_jid: remoteJid }
               });
               if (created) {
                   EvolutionService.sendMessage(remoteJid, `🚙 *Olá pessoal! Fui ativado neste grupo com sucesso pelo motorista ${motorista.nome}.*\n\nPara organizarmos as rotas da Van, preciso que todos enviem a mensagem abaixo aqui no grupo:\n\n*/cadastro*\n\n(Assim que enviarem, mandarei uma mensagem no privado de cada um!)`);
               }
           } else {
               // Non-paying author. If our bot is in the participants list, we leave.
               // We don't have our own id from body easily, but we can assume if the bot is triggering this payload in a new group via an unknown driver, it should ignore or leave.
               // Normally: EvolutionService.leaveGroup(remoteJid);
               console.log(`[Group Validation] Ignore: ${author} não é motorista ativo no banco.`);
           }
       }
    }
  }
}

module.exports = new WebhookController();
