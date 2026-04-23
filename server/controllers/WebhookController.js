const WebhookQueueService = require('../services/WebhookQueueService');
const ReceiptParserService = require('../services/ReceiptParserService');
const EvolutionService = require('../services/EvolutionService');
const Passageiro = require('../models/Passageiro');
const Financeiro = require('../models/Financeiro');
const Motorista = require('../models/Motorista');
const GrupoMotorista = require('../models/GrupoMotorista');
const MessageVariation = require('../utils/MessageVariation');
const SalesService = require('../services/SalesService');
const LlmService = require('../services/LlmService');
const { normalizePhone } = require('../utils/phoneHelper');
const { hashPassword } = require('../utils/passwordHash');

// Cache simples para evitar processamento duplicado (Evolution API as vezes repete o webhook)
const processedMessages = new Set();
const CACHE_LIMIT = 500; // Limite de IDs para não crescer infinitamente
const LOCATION_MESSAGE_TYPES = new Set(['locationMessage', 'liveLocationMessage']);

const unwrapMessage = (message) => {
   if (!message) return message;
   return message.ephemeralMessage?.message ||
      message.viewOnceMessage?.message ||
      message.viewOnceMessageV2?.message ||
      message.documentWithCaptionMessage?.message ||
      message;
};

const getLocationPayload = (message) => {
   const unwrapped = unwrapMessage(message);
   return unwrapped?.locationMessage || unwrapped?.liveLocationMessage || null;
};

const getEnvelopeMessagePayload = (data) => {
   return unwrapMessage(
      data?.message ||
      data?.update?.message ||
      data?.update?.editedMessage?.message ||
      data?.update ||
      null
   );
};

class WebhookController {

   handleEvolutionAPI = async (req, res) => {
      try {
         const body = req.body;
         if (!body) return res.status(400).send('Payload vazio');

         const event = body.event;
         const instance = body.instance;

         // Responde logo ao webhook (200 OK) para evitar re-envio por timeout
         res.status(200).send({ status: 'received' });

         // Verificação de duplicidade por ID de mensagem (se disponível no payload)
         const firstDataForCache = Array.isArray(body.data?.messages)
            ? body.data.messages[0]
            : (Array.isArray(body.data) ? body.data[0] : body.data);
         let msgId = firstDataForCache?.key?.id || body.data?.key?.id;
         const locationForCache = getLocationPayload(getEnvelopeMessagePayload(firstDataForCache));
         if (msgId && locationForCache) {
            const lat = locationForCache.degreesLatitude ?? locationForCache.latitude ?? locationForCache.lat;
            const lng = locationForCache.degreesLongitude ?? locationForCache.longitude ?? locationForCache.lng;
            const timestamp =
               firstDataForCache?.messageTimestamp ||
               firstDataForCache?.update?.messageTimestamp ||
               firstDataForCache?.message?.messageTimestamp ||
               body.date_time ||
               '';
            msgId = `${msgId}:${lat ?? 'lat'}:${lng ?? 'lng'}:${timestamp}`;
         } else if (msgId && (event === 'messages.update' || event === 'MESSAGES_UPDATE')) {
            const updateSignatureSource = firstDataForCache?.update || firstDataForCache?.status || body.date_time || '';
            const updateSignature =
               typeof updateSignatureSource === 'string'
                  ? updateSignatureSource
                  : JSON.stringify(updateSignatureSource).slice(0, 240);
            msgId = `${msgId}:${updateSignature}`;
         }
         if (msgId) {
            if (processedMessages.has(msgId)) {
               return;
            }
            processedMessages.add(msgId);

            // Mantém o cache sob controle
            if (processedMessages.size > CACHE_LIMIT) {
               const firstItem = processedMessages.values().next().value;
               processedMessages.delete(firstItem);
            }
         }

         // Suporte a minúsculas e maiúsculas (Evolution v1 vs v2)
         const validEvents = [
            'messages.upsert', 'MESSAGES_UPSERT',
            'messages.create', 'MESSAGES_CREATE',
            'messages.update', 'MESSAGES_UPDATE',
            'group-participants.update', 'GROUP_PARTICIPANTS_UPDATE',
            'groups.upsert', 'GROUPS_UPSERT',
            'poll.vote', 'POLL_VOTE'
         ];

         console.log(`[Webhook] Evento recebido: ${event}`);

         if (!validEvents.includes(event)) {
            return;
         }

         // ====== TRATAMENTO DE GROUPS.UPSERT (Bot adicionado a um grupo novo) ======
         if (event === 'groups.upsert' || event === 'GROUPS_UPSERT') {
            await this._handleGroupsUpsert(body.data);
            return;
         }

         // ====== TRATAMENTO DE GROUP-PARTICIPANTS.UPDATE ======
         if (event === 'group-participants.update' || event === 'GROUP_PARTICIPANTS_UPDATE') {
            await this._handleGroupParticipantsUpdate(body.data);
            return;
         }

         if (event === 'poll.vote' || event === 'POLL_VOTE') {
            await this._handlePollUpdate(body.data);
            return;
         }

         let messages = [];
         if (Array.isArray(body.data?.messages)) {
            messages = body.data.messages;
         } else if (Array.isArray(body.data)) {
            messages = body.data;
         } else if (body.data && typeof body.data === 'object' && body.data.key) {
            messages = [body.data];
         }

         // Só interrompe por falta de mensagens se o evento for do tipo UPSERT ou CREATE
         if (messages.length === 0 && ['messages.upsert', 'MESSAGES_UPSERT', 'messages.create', 'MESSAGES_CREATE'].includes(event)) {
            console.log('[Webhook] âš ï¸ Nenhuma mensagem encontrada no campo data para evento de mensagem.');
            return;
         }

         for (const data of messages) {
            console.log("[DEBUG] Processando mensagem:", JSON.stringify(data).substring(0, 200));

            const remoteJid = data.key?.remoteJid;
            const participant = data.key?.participant || remoteJid; // For groups, sender is participant
            const isFromMe = data.key?.fromMe;
            const isGroup = remoteJid?.endsWith('@g.us');
            const payloadMessage = getEnvelopeMessagePayload(data);
            let textMessage = payloadMessage?.conversation || payloadMessage?.extendedTextMessage?.text || '';

            if (isFromMe || !remoteJid) continue;

            console.log(`[Webhook] Mensagem recebida de ${remoteJid}`);

            // 1. Tratativa de Arquivos e Fotos (Para Comprovantes) e íudios (Para Whisper STT)
            const messageKeys = payloadMessage ? Object.keys(payloadMessage) : [];
            console.log(`[Webhook] Message keys: ${messageKeys.join(',') || 'none'}`);
            const msgType = messageKeys.find(key => key === 'audioMessage' || key === 'imageMessage' || key === 'documentMessage' || key === 'videoMessage' || key === 'pollUpdateMessage' || LOCATION_MESSAGE_TYPES.has(key)) || messageKeys[0];

            // Tratamento Específico para Voice Notes (íudios do Motorista)
            if (msgType === 'audioMessage') {
               let base64ToUse = data.base64;

               if (!base64ToUse) {
                  console.log(`[Audio] ðŸŽ™ï¸ Base64 ausente, baixando da API para a mensagem ${data.key.id}...`);
                  base64ToUse = await EvolutionService.getMediaBase64(data.key.id);
               }

               if (base64ToUse) {
                  console.log(`[Audio] íudio pronto para ${remoteJid}, iniciando conversão e Whisper STT Local...`);
                  try {
                     const AudioTranscriptionService = require('../services/AudioTranscriptionService');
                     const textoTranscrito = await AudioTranscriptionService.transcribeAudioBase64(base64ToUse);

                     if (!textoTranscrito || textoTranscrito.trim() === '') {
                        console.log(`[Audio] íudio ininteligível ou vazio ignorado.`);
                        return;
                     }

                     console.log(`[Audio] STT finalizou. Texto transcrito: "${textoTranscrito}"`);

                     // FINGE ser uma mensagem de texto para o funil fluir nas IA's normais lá para baixo
                     textMessage = textoTranscrito;
                  } catch (e) {
                     console.error('[Audio] Erro na transcrição STT:', e);
                     return; // Impede que o fluxo vá pra frente com a variável textMessage vazia
                  }
               } else {
                  console.warn(`[Audio] íudio detectado de ${remoteJid}, mas sem conteúdo Base64. Verifique se o envio de Base64 está ativado nas configuraçíµes do Webhook da sua instância Evolution.`);
                  return;
               }
            }
            // Tratamento Atualizado de Mídias/Imagens para Recibos
            else if (msgType === 'imageMessage' || msgType === 'documentMessage') {
               console.log(`[Financeiro] 📍· Imagem/Documento recebido de ${remoteJid}. Possível comprovante de passageiro.`);
               let hasBase64 = data.base64 || data.message?.base64;

               if (!hasBase64) {
                  console.log(`[Financeiro] 📍¥ Base64 ausente no webhook. Baixando arquivo da API para análise do robô...`);
                  const EvolutionService = require('../services/EvolutionService');
                  try {
                     hasBase64 = await EvolutionService.getMediaBase64(data.key.id);
                  } catch (err) {
                     console.error(`[Financeiro] Erro ao baixar a mídia da API (ID: ${data.key.id}):`, err.message);
                  }
               }

               if (hasBase64) {
                  console.log(`[Financeiro] Analisando Mídia Multimodal de ${remoteJid}...`);
                  const analise = await ReceiptParserService.validarComprovante(hasBase64, msgType === 'imageMessage' ? 'image/jpeg' : 'application/pdf');

                  if (analise.isReceipt) {
                     // Achar Passageiro
                     const passageiro = await Passageiro.findOne({ where: { telefone_responsavel: remoteJid } });
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
                                 const texto = `⚠️ *Alerta Financeiro de ${passageiro.nome}*\nO valor cobrado era R$ ${fin.valor_mensalidade}, mas o Pix parece ter sido de R$ ${analise.value}.\nDetalhe da IA: ${analise.details}\n\nVocê autoriza dar baixa nesse comprovante? Recuse ou ajuste pelo painel.`;
                                 EvolutionService.sendMessage(motorista.telefone, texto);
                              }
                              EvolutionService.sendMessage(remoteJid, MessageVariation.financeiro.falha(passageiro.nome));
                           }
                        } else {
                           EvolutionService.sendMessage(remoteJid, '🤔 Você não possui mensalidades pendentes cadastradas no sistema no momento.');
                        }
                     }
                  }
                  return; // Bloqueia o arquivo de ir pro buffer do LLM text-only
               }
            }

            if (msgType === 'pollUpdateMessage') {
               console.log(`[Webhook] PollUpdate detectado via ${event} de ${remoteJid}`);
               await this._handlePollUpdate(data);
               continue;
            }

            // 1.5 Tratamento de Localização em Tempo Real (GPS Tracking)
            if (msgType === 'locationMessage' || msgType === 'liveLocationMessage') {
               const locData = getLocationPayload(payloadMessage);
               const lat = locData?.degreesLatitude ?? locData?.latitude ?? locData?.lat;
               const lng = locData?.degreesLongitude ?? locData?.longitude ?? locData?.lng;

               if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
                  const senderJid = isGroup
                     ? (data.key?.participantAlt || data.participantAlt || data.key?.participantPn || data.participantPn || data.key?.participant || participant)
                     : remoteJid;

                  if (!senderJid || senderJid.endsWith('@g.us')) {
                     console.log(`[GPS] Localizacao ignorada: remetente do motorista ausente. remote=${remoteJid}`);
                     continue;
                  }

                  const normalizedSender = normalizePhone(senderJid);
                  console.log(`[GPS] Localizacao recebida de ${normalizedSender} via ${isGroup ? 'grupo' : 'privado'} (${lat}, ${lng})`);
                  const LiveTrackingService = require('../services/LiveTrackingService');
                  await LiveTrackingService.processLocationUpdate(
                     normalizedSender,
                     Number(lat),
                     Number(lng)
                  );
               } else {
                  console.log(`[GPS] Localizacao ignorada: coordenadas ausentes. keys=${messageKeys.join(',') || 'none'}`);
               }
               continue; // Localização não vai pro funil de texto
            }

            // 1.6 FUNIL DE VENDAS PARA NOVOS MOTORISTAS (DESCONHECIDOS)
            const normalizedJid = normalizePhone(remoteJid);


            // 1.6a LINK MAGICO (VAN X) - Intercepta ANTES do funil de vendas
            // Quando um aluno clica no link magico do grupo, ele manda "VAN <id>" no privado.
            if (!isGroup) {
               const vanMatchEarly = textMessage.toUpperCase().trim().match(/^VAN\s+(\d+)$/);
               if (vanMatchEarly) {
                  const motoristaId = parseInt(vanMatchEarly[1]);
                  const motoristaAlvo = await Motorista.findOne({ where: { id: motoristaId, status: 'ativo' } });

                  if (!motoristaAlvo) {
                     EvolutionService.sendMessage(remoteJid, 'âš ï¸ Código de van inválido ou expirado. Peça ao motorista para reenviar o link no grupo.');
                     return;
                  }

                  // Verifica se ja existe como passageiro
                  let passageiroExistente = await Passageiro.findOne({ where: { telefone_responsavel: normalizedJid } });
                  if (passageiroExistente && passageiroExistente.onboarding_step === 'CONCLUIDO') {
                     EvolutionService.sendMessage(remoteJid, 'Você já está com o cadastro concluído no sistema da van!');
                     return;
                  }

                  if (!passageiroExistente) {
                     passageiroExistente = await Passageiro.create({
                        nome: 'Aguardando',
                        telefone_responsavel: normalizedJid,
                        onboarding_step: 'AGUARDANDO_NOME',
                        motorista_id: motoristaAlvo.id
                     });
                  }

                  console.log('[Onboarding] Passageiro ' + normalizedJid + ' vinculado ao motorista ' + motoristaAlvo.nome + ' (ID ' + motoristaAlvo.id + ') via Link Mágico.');
                  EvolutionService.sendMessage(remoteJid, '👋 Olá! Bem-vindo(a) ao *VANBORA*, o assistente inteligente da van do(a) *' + motoristaAlvo.nome + '*!\nVamos configurar sua vaga rapidinho.\n\n*1. Qual o seu nome completo?*');
                  return;
               }
            }


            if (!isGroup) {
               const m = await Motorista.findOne({ where: { telefone: normalizedJid } });
               const p = await Passageiro.findOne({ where: { telefone_responsavel: normalizedJid } });

               // Se não conhecemos esse número de lugar nenhum, ou se ele já é um LEAD
               if (!p && (!m || m.status === 'lead')) {
                  // A. NOVO LEAD (Primeiro contato)
                  if (!m) {
                     console.log(`[Vendas] Novo prospect: ${remoteJid}. Enviando Pitch.`);
                     await Motorista.create({ telefone: normalizedJid, status: 'lead', venda_etapa: 'APRESENTACAO' });
                     await EvolutionService.sendMessage(remoteJid, SalesService.getPitch());
                     return;
                  }

                  // B. ETAPA: APRESENTACAO (Aguardando confirmação de interesse)
                  if (m.venda_etapa === 'APRESENTACAO') {
                     const temInteresse = await LlmService.parsePurchaseIntent(textMessage);
                     if (temInteresse) {
                        m.venda_etapa = 'AGUARDANDO_PAGAMENTO';
                        await m.save();
                        await EvolutionService.sendMessage(remoteJid, SalesService.getPaymentInstructions());
                        return;
                     }
                  }

                  // C. ETAPA: AGUARDANDO_PAGAMENTO (Processando o comprovante)
                  if (m.venda_etapa === 'AGUARDANDO_PAGAMENTO') {
                     if (msgType === 'imageMessage' || msgType === 'documentMessage') {
                        console.log(`[Vendas] 📍· Imagem/Documento recebido (possível comprovante) do ${remoteJid}.`);

                        let hasBase64 = data.base64 || data.message?.base64;
                        if (!hasBase64) {
                           console.log(`[Vendas] 📍¥ Base64 ausente no webhook. Baixando mídia da API para o comprovante...`);
                           const EvolutionService = require('../services/EvolutionService');
                           try {
                              hasBase64 = await EvolutionService.getMediaBase64(data.key.id);
                           } catch (err) {
                              console.error(`[Vendas] Erro ao baixar a mídia da API (ID: ${data.key.id})`);
                           }
                        }

                        if (hasBase64) {
                           console.log(`[Vendas] Analisando comprovante de entrada para lead ${remoteJid}...`);
                           const analise = await ReceiptParserService.validarComprovante(hasBase64, msgType === 'imageMessage' ? 'image/jpeg' : 'application/pdf');

                           if (analise.isReceipt && analise.value >= SalesService.MONTHLY_VALUE && analise.fraudScore < 30) {
                              m.venda_etapa = 'AGUARDANDO_NOME';
                              await m.save();

                              // Cria a assinatura inicial
                              const Assinatura = require('../models/Assinatura');
                              await Assinatura.create({
                                 motorista_id: m.id,
                                 valor_plano: SalesService.MONTHLY_VALUE,
                                 status: 'ativo',
                                 data_inicio: new Date()
                              });

                              await EvolutionService.sendMessage(remoteJid, SalesService.getSuccessMessage());
                              return;
                           } else {
                              await EvolutionService.sendMessage(remoteJid, `âš ï¸ hmmm, não consegui validar esse comprovante. Verifique o valor (R$ ${SalesService.MONTHLY_VALUE}) e tente mandar a imagem novamente.`);
                              return;
                           }
                        }
                     }
                  }

                  // D. ETAPA: AGUARDANDO_NOME (Coleta do nome e pergunta da lotação)
                  if (m.venda_etapa === 'AGUARDANDO_NOME' && textMessage.trim().length > 3) {
                     m.nome = textMessage.trim();
                     m.venda_etapa = 'AGUARDANDO_LOTACAO';
                     await m.save();

                     await EvolutionService.sendMessage(remoteJid, MessageVariation.onboardingMotorista.perguntaLotacao(m.nome));
                     return;
                  }

                  // E. ETAPA: AGUARDANDO_LOTACAO
                  if (m.venda_etapa === 'AGUARDANDO_LOTACAO') {
                     const capacidade = await LlmService.parseDriverCapacity(textMessage);
                     if (capacidade && capacidade.isCapacity) {
                        m.meta_manha = capacidade.manha || 0;
                        m.meta_tarde = capacidade.tarde || 0;
                        m.meta_noite = capacidade.noite || 0;
                        m.venda_etapa = 'AGUARDANDO_GARAGEM';
                        await m.save();

                        await EvolutionService.sendMessage(remoteJid, MessageVariation.onboardingMotorista.perguntaGaragem());
                        return;
                     } else {
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.onboardingMotorista.erroLotacao());
                        return;
                     }
                  }

                  // F. ETAPA: AGUARDANDO_GARAGEM
                  if (m.venda_etapa === 'AGUARDANDO_GARAGEM') {
                     const GeocodeService = require('../services/GeocodeService');
                     const coords = await GeocodeService.getCoordinates(textMessage);

                     if (coords) {
                        m.latitude = coords.lat;
                        m.longitude = coords.lng;
                        m.venda_etapa = 'AGUARDANDO_ESCOLA';
                        await m.save();

                        await EvolutionService.sendMessage(remoteJid, MessageVariation.onboardingMotorista.perguntaEscola());
                        return;
                     } else {
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.onboardingMotorista.erroEndereco('garagem'));
                        return;
                     }
                  }

                  // G. ETAPA: AGUARDANDO_ESCOLA
                  if (m.venda_etapa === 'AGUARDANDO_ESCOLA') {
                     const GeocodeService = require('../services/GeocodeService');
                     const coords = await GeocodeService.getCoordinates(textMessage);

                     if (coords) {
                        m.escola_nome = textMessage.split(',')[0].trim() || textMessage;
                        m.escola_latitude = coords.lat;
                        m.escola_longitude = coords.lng;

                        // Finaliza o onboarding
                        m.venda_etapa = 'AGUARDANDO_SENHA';
                        await m.save();

                        const loginPainel = m.telefone.split('@')[0];
                        await EvolutionService.sendMessage(
                           remoteJid,
                           `Ultimo passo: vou criar seu acesso ao painel VANBORA.\n\nSeu login sera seu numero: *${loginPainel}*\n\nAgora me envie a senha que voce quer usar no painel. Use pelo menos 6 caracteres.`
                        );
                        return;

                        // Manda as mensagens de tutorial e dicas
                        await EvolutionService.sendMessage(remoteJid, "Vou te enviar aqui embaixo também um breve tutorial com o resumo das minhas funçíµes para você deixar salvo. ðŸ‘‡");
                        return;
                     } else {
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.onboardingMotorista.erroEndereco('escola'));
                        return;
                     }
                  }

                  if (m.venda_etapa === 'AGUARDANDO_SENHA') {
                     const senhaPainel = textMessage.trim();
                     if (senhaPainel.length < 6) {
                        await EvolutionService.sendMessage(remoteJid, 'Essa senha ficou curta. Me envie uma senha com pelo menos 6 caracteres para o painel.');
                        return;
                     }

                     m.senha_hash = hashPassword(senhaPainel);
                     m.status = 'ativo';
                     m.venda_etapa = 'CONCLUIDO';
                     m.boas_vindas_enviada = true;
                     await m.save();

                     const painelUrl = process.env.PAINEL_URL || process.env.FRONTEND_URL || 'http://localhost:5173/login';
                     const loginPainel = m.telefone.split('@')[0];
                     await EvolutionService.sendMessage(
                        remoteJid,
                        `Acesso criado.\n\nPainel: ${painelUrl}\nLogin: ${loginPainel}\nSenha: a senha que voce acabou de escolher.\n\nPelo painel voce acompanha alunos, financeiro, configuracoes e dados da sua van.`
                     );

                     await EvolutionService.sendMessage(remoteJid, LlmService.getDriverOnboardingMessage(m.nome));
                     await EvolutionService.sendMessage(remoteJid, 'Vou te enviar aqui embaixo tambem um breve tutorial com o resumo das minhas funcoes para voce deixar salvo.');
                     await EvolutionService.sendMessage(remoteJid, LlmService.getDriverTutorialMessage(m.nome));

                     console.log(`[Vendas] ONBOARDING COMPLETO! Novo motorista: ${m.nome}`);
                     return;
                  }

                  // Se for conversa genérica de lead, ignora ou manda pitch de novo se for muito tempo
                  return;
               }
            }

            if (!isGroup) {
               const m = await Motorista.findOne({ where: { telefone: normalizedJid, status: 'ativo' } });
               if (m) {
                  // A0. Comando Garagem (Base da Rota)
                  if (textMessage.toLowerCase().startsWith('garagem ')) {
                     const GeocodeService = require('../services/GeocodeService');
                     const enderecoBase = textMessage.substring(8).trim();

                     EvolutionService.sendMessage(remoteJid, `📍 Processando coordenadas da garagem...`);

                     const coords = await GeocodeService.getCoordinates(enderecoBase);
                     if (coords) {
                        m.latitude = coords.lat;
                        m.longitude = coords.lng;
                        await m.save();
                        EvolutionService.sendMessage(remoteJid, `✅ Garagem registrada nas coordenadas detectadas!\nA partir de agora usarei essa base para montar suas rotas.`);
                     } else {
                        EvolutionService.sendMessage(remoteJid, `âš ï¸ Não consegui achar o endereço no mapa. Mande algo mais completo. Exemplo:\ngaragem Rua XYZ, 110, Bairro - Cidade`);
                     }
                     return;
                  }

                  // A0b. Comando Escola (Destino da Rota - para aviso no grupo)
                  if (textMessage.toLowerCase().startsWith('escola ')) {
                     const GeocodeService = require('../services/GeocodeService');
                     const textoEscola = textMessage.substring(7).trim();

                     EvolutionService.sendMessage(remoteJid, `ðŸ« Processando localização da escola/faculdade...`);

                     const coords = await GeocodeService.getCoordinates(textoEscola);
                     if (coords) {
                        m.escola_nome = textoEscola.split(',')[0].trim() || textoEscola;
                        m.escola_latitude = coords.lat;
                        m.escola_longitude = coords.lng;
                        await m.save();
                        EvolutionService.sendMessage(remoteJid, `✅ Escola/Faculdade registrada: *${m.escola_nome}*!\nQuando a van estiver chegando, vou avisar a galera no grupo automaticamente.`);
                     } else {
                        EvolutionService.sendMessage(remoteJid, `âš ï¸ Não achei esse endereço. Tenta algo mais completo. Exemplo:\nescola UFS, São Cristóvão - SE`);
                     }
                     return;
                  }

                  // A. Lotação
                  if (textMessage.toLowerCase().startsWith('lotacao ')) {
                     const parts = textMessage.toLowerCase().split(' ');
                     if (parts.length === 3) {
                        const turno = parts[1].replace('ã', 'a'); // manha, tarde, noite
                        const valor = parseInt(parts[2]);
                        let alterado = false;
                        if (turno === 'manha') { m.meta_manha = valor; alterado = true; }
                        if (turno === 'tarde') { m.meta_tarde = valor; alterado = true; }
                        if (turno === 'noite') { m.meta_noite = valor; alterado = true; }

                        if (alterado) {
                           await m.save();
                           EvolutionService.sendMessage(remoteJid, `✅ Capacidade do turno ${turno.toUpperCase()} definida para ${valor} alunos! Vou te avisar conforme eles forem entrando no sistema.`);
                        } else {
                           EvolutionService.sendMessage(remoteJid, `âš ï¸ Turno inválido. Escreva: lotacao manha 15, lotacao tarde 10...`);
                        }
                        return;
                     }
                  }

                  // A2. Comando Raio (Configurar raio de notificação GPS)
                  const raioMatch = textMessage.toLowerCase().trim().match(/^raio\s+(\d+\.?\d*)$/);
                  if (raioMatch) {
                     const kmValue = parseFloat(raioMatch[1]);
                     m.raio_notificacao = Math.round(kmValue * 1000); // Converte km para metros
                     await m.save();
                     EvolutionService.sendMessage(remoteJid, MessageVariation.rastreamento.raioAlterado(kmValue));
                     return;
                  }

                  // B. Pausas Operacionais (Férias e Feriados via LLM)
                  const LlmService = require('../services/LlmService');
                  const hojeFormatado = new Date().toISOString().split('T')[0];
                  const pauseDetectado = await LlmService.parseOperationPause(textMessage, hojeFormatado);

                  if (pauseDetectado && pauseDetectado.isPauseCommand) {
                     if (pauseDetectado.type === 'FERIADO') {
                        m.pausa_inicio = pauseDetectado.startDate;
                        m.pausa_fim = pauseDetectado.endDate;
                        await m.save();
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.pausas.confirmacao('Feriado ou Recesso', pauseDetectado.endDate));
                     } else if (pauseDetectado.type === 'FERIAS_INICIO') {
                        m.em_ferias = true;
                        m.pausa_inicio = pauseDetectado.startDate;
                        m.pausa_fim = pauseDetectado.endDate;
                        await m.save();
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.pausas.confirmacao('Férias Prolongadas', pauseDetectado.endDate));
                     } else if (pauseDetectado.type === 'FERIAS_FIM') {
                        m.em_ferias = false;
                        m.pausa_inicio = null;
                        m.pausa_fim = null;
                        await m.save();
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.pausas.retorno());
                     }
                     return; // Bloqueia propagação
                  }

                  // C. Lançamento de Gastos / Despesas (via LLM)
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
                     inicioMes.setHours(0, 0, 0, 0);
                     const fimMes = new Date();
                     fimMes.setMonth(fimMes.getMonth() + 1);
                     fimMes.setDate(0);
                     fimMes.setHours(23, 59, 59, 999);

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
                        EvolutionService.sendMessage(participant, "👋 Olá! Vi sua requisição!\n*1. Qual o seu nome completo?*");
                     } else {
                        EvolutionService.sendMessage(participant, "Você já está com o cadastro concluído no sistema da van!");
                     }
                  }
               }
               return; // Don't process other group texts via NLP/Queue
            }

            // 3. Fila Privada (Chatbot de Onboarding)
            let passageiro = await Passageiro.findOne({ where: { telefone_responsavel: normalizedJid } });


            if (passageiro && passageiro.onboarding_step !== 'CONCLUIDO') {
               const passo = passageiro.onboarding_step;
               console.log(`[Onboarding] Pessoas ${remoteJid} respondeu passo: ${passo}`);

               if (passo === 'AGUARDANDO_NOME') {
                  passageiro.nome = textMessage;
                  passageiro.onboarding_step = 'AGUARDANDO_TURNO';
                  await passageiro.save();
                  EvolutionService.sendMessage(remoteJid, `Perfeito! Nome registrado: ${textMessage}.\n\n*2. Qual o seu turno de estudo?*\n(Ex: Manhã, Tarde, Noite, Integral)`);
                  return;
               }
               if (passo === 'AGUARDANDO_TURNO') {
                  const result = await LlmService.parseShift(textMessage);

                  if (result.shift !== 'UNKNOWN' && result.confidence >= 70) {
                     passageiro.turno = result.shift;
                     passageiro.onboarding_step = 'AGUARDANDO_ENDERECO';
                     await passageiro.save();
                     console.log(`[Onboarding] Passo TURNO completo para ${remoteJid}: ${result.shift}. Indo para ENDERECO.`);
                     EvolutionService.sendMessage(remoteJid, `Ok, Turno ${result.shift}.\n\n*3. Agora preciso dos seus endereços de embarque.*\n\nSe você embarca sempre no mesmo lugar, mande *um* endereço.\nSe tem mais de um local (ex: casa da mãe e casa do pai), mande *um por linha*, começando com um apelido:\n\nExemplo:\nCasa da Mãe - Rua das Flores, 123, Centro\nCasa do Pai - Av. Brasil, 456, Jardim América\n\n📍  Mande todos agora numa mensagem só:`);
                  } else {
                     console.log(`[Onboarding] Turno inválido ou baixa confiança (${result.confidence}%) para ${remoteJid}: ${textMessage}`);
                     EvolutionService.sendMessage(remoteJid, `Ops, não entendi bem o seu turno. 🧐\n\nPor favor, responda apenas com uma das opções:\n- *Manhã*\n- *Tarde*\n- *Noite*`);
                  }
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
                     let bairroDetectado = null;

                     try {
                        const coords = await GeocodeService.getCoordinates(enderecoCompleto);
                        if (coords) {
                           latitude = coords.lat;
                           longitude = coords.lng;
                           bairroDetectado = coords.neighborhood;
                        }

                        // Fallback se o Geocode não retornou bairro ou se falhou parcialmente
                        if (!bairroDetectado) {
                           bairroDetectado = await LlmService.extractNeighborhood(linha);
                        }
                     } catch (geoErr) {
                        console.error('[Geocode] Erro na busca de coordenadas:', geoErr);
                        // Tenta fallback via IA mesmo com erro de GPS
                        bairroDetectado = await LlmService.extractNeighborhood(linha);
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
                        // Salva o bairro do primeiro endereço (principal) no passageiro
                        if (bairroDetectado) {
                           passageiro.bairro = bairroDetectado;
                           console.log(`[Onboarding] Bairro identificado para ${passageiro.nome}: ${bairroDetectado}`);
                        }
                     }
                     countCadastrados++;
                  }

                  passageiro.endereco_ida_id = primeiroEnderecoId;
                  passageiro.endereco_volta_id = primeiroEnderecoId;
                  passageiro.onboarding_step = 'AGUARDANDO_MENSALIDADE';
                  await passageiro.save();

                  const msgConfirm = MessageVariation.enderecos.confirmacao(countCadastrados);
                  EvolutionService.sendMessage(remoteJid, msgConfirm);

                  // Pede a mensalidade com piadinha
                  setTimeout(() => {
                     EvolutionService.sendMessage(remoteJid, `*4. Última pergunta!* 💰\nQual o valor da sua mensalidade da van?\n\n(Ex: 250, 180.50)\n\n⚠️ _Esse valor será verificado pelo motorista, então nem tenta colocar R$ 1,99 que não cola não, hein! 😂🚌_`);
                  }, 2000);
                  return;
               }
               if (passo === 'AGUARDANDO_MENSALIDADE') {
                  // Limpa o texto e tenta extrair um número
                  const textoLimpo = textMessage.replace(/[rR]\$/, '').replace(/\s/g, '').replace(',', '.').trim();
                  const valor = parseFloat(textoLimpo);

                  if (isNaN(valor) || valor <= 0) {
                     EvolutionService.sendMessage(remoteJid, `🤔 Não entendi esse valor. Manda só o número, por favor!\nExemplo: *250* ou *180.50*`);
                     return;
                  }

                  passageiro.mensalidade = valor;
                  passageiro.onboarding_step = 'CONCLUIDO';
                  await passageiro.save();

                  EvolutionService.sendMessage(remoteJid, `✅ *Cadastro finalizado com sucesso!* 🥳\n\n📋 *Resumo:*\n👤 ${passageiro.nome}\n🕒 Turno: ${passageiro.turno}\n💰 Mensalidade: R$ ${valor.toFixed(2)}\n\nAgora é só ficar de olho na enquete diária no grupo! 🚌`);

                  // Notificação de Meta para o Motorista Responsável
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
                        if (counts >= meta) textMeta = `(LOTAÇÃO COMPLETA! 🥳 A van encheu!)`;
                        else textMeta = `(Faltam ${meta - counts} alunos para fechar a lista desse turno!)`;
                     }

                     const notifyText = `🔔 *Novo Aluno a Bordo!*\n\nO(A) responsável/aluno *${passageiro.nome}* concluiu o auto-cadastro para o turno *${passageiro.turno}*.\nMensalidade informada: *R$ ${valor.toFixed(2)}*\n\n📊 *Resumo do Turno:* Você tem ${counts} confirmados.\n${textMeta}`;
                     EvolutionService.sendMessage(motorista_resp.telefone, notifyText);
                  }

                  return;
               }
            } else if (passageiro && passageiro.onboarding_step === 'CONCLUIDO') {
               const rideConfirmationHandled = await this._handlePrivateRideConfirmation(passageiro, remoteJid, textMessage);
               if (rideConfirmationHandled) {
                  return;
               }

               // 3.5 Cancelamento de Trecho via LLM (passageiro desiste da ida ou volta)
               const LlmServiceCancel = require('../services/LlmService');
               const cancelDetect = await LlmServiceCancel.parseRideCancellation(textMessage);

               if (cancelDetect && cancelDetect.isCancellation) {
                  const cancelarIda = cancelDetect.trecho === 'ida' || cancelDetect.trecho === 'ambos';
                  const cancelarVolta = cancelDetect.trecho === 'volta' || cancelDetect.trecho === 'ambos';

                  const Viagem = require('../models/Viagem');
                  const ViagemPassageiro = require('../models/ViagemPassageiro');
                  const hojeStr = new Date().toISOString().split('T')[0];

                  // Busca viagens de hoje onde esse passageiro está
                  const vpsHoje = await ViagemPassageiro.findAll({
                     where: { passageiro_id: passageiro.id },
                     include: [{ model: Viagem, where: { data: hojeStr } }]
                  });

                  if (vpsHoje.length > 0) {
                     for (const vp of vpsHoje) {
                        if (cancelarIda && vp.status_ida === 'confirmado') vp.status_ida = 'ausente';
                        if (cancelarVolta && vp.status_volta === 'confirmado') vp.status_volta = 'ausente';
                        await vp.save();
                     }

                     let trechoMsg = cancelarIda && cancelarVolta ? 'ida e volta' : cancelarIda ? 'ida' : 'volta';
                     EvolutionService.sendMessage(remoteJid,
                        `✅ Anotado, *${passageiro.nome}*! Tirei você da lista de *${trechoMsg}* de hoje. Se mudar de ideia, é só votar de novo na enquete! 🚌`
                     );
                     return;
                  } else {
                     EvolutionService.sendMessage(remoteJid,
                        `🤔 *${passageiro.nome}*, não encontrei nenhuma viagem sua cadastrada para hoje. Será que a enquete ainda não abriu?`
                     );
                     return;
                  }
               }

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

         // Captura de votos da enquete em payloads de messages.update.
         // Outros updates (como live location) precisam seguir para o funil normal.
         if ((event === 'messages.update' || event === 'MESSAGES_UPDATE') && this._containsPollVotePayload(body.data)) {
            await this._handlePollUpdate(body.data);
            return;

            /*
            Legacy parser disabled. _handlePollUpdate handles both MESSAGES_UPDATE and pollUpdateMessage payloads.
            const data = body.data;
            if (!data) return;

            try {
               const updateInfo = typeof data === 'object' && !Array.isArray(data) ? data : data[0];
               if (updateInfo && updateInfo.update && updateInfo.update.pollUpdates) {
                  const voterJid = normalizePhone(updateInfo.key?.participantAlt || updateInfo.participantAlt || updateInfo.key?.participant || updateInfo.key?.remoteJid);
                  const groupJid = updateInfo.key.remoteJid;
                  console.log(`[Webhook] Recebeu Polling Update (Voto) de ${voterJid} no grupo ${groupJid}`);

                  // Extrai a opção selecionada do array de pollUpdates
                  const pollUpdates = updateInfo.update.pollUpdates;
                  let selectedOption = null;
                  for (const pu of pollUpdates) {
                     // Cada pollUpdate tem um .vote com as opçíµes selecionadas
                     if (pu.vote && pu.vote.selectedOptions && pu.vote.selectedOptions.length > 0) {
                        selectedOption = pu.vote.selectedOptions[0]; // Pega a primeira (selectableCount=1)
                     }
                  }

                  if (!selectedOption) {
                     console.log(`[Webhook] Voto sem opção selecionada detectado. Ignorando...`);
                     return;
                  }

                  console.log(`[Webhook] Opção votada: "${selectedOption}" por ${voterJid}`);

                  // Acha o passageiro pelo telefone (pode estar no telefone_responsavel)
                  const passageiroVotante = await Passageiro.findOne({
                     where: { telefone_responsavel: voterJid, onboarding_step: 'CONCLUIDO' }
                  });

                  if (!passageiroVotante) {
                     console.log(`[Webhook] Passageiro ${voterJid} não encontrado ou não concluído. Voto ignorado.`);
                     return;
                  }

                  // Identifica o motorista pelo grupo
                  const grupoVoto = await GrupoMotorista.findOne({ where: { group_jid: groupJid } });
                  if (!grupoVoto) {
                     console.log(`[Webhook] Grupo ${groupJid} não encontrado no sistema. Voto ignorado.`);
                     return;
                  }

                  const Viagem = require('../models/Viagem');
                  const ViagemPassageiro = require('../models/ViagemPassageiro');

                  // Descobre o turno pela hora atual (enquete manhã abre ~05h, tarde ~11h, noite ~17h)
                  const horaAtual = new Date().getHours();
                  let turnoVoto = 'manha';
                  if (horaAtual >= 10 && horaAtual < 16) turnoVoto = 'tarde';
                  else if (horaAtual >= 16) turnoVoto = 'noite';

                  const hojeStr = new Date().toISOString().split('T')[0];

                  // Cria ou encontra a viagem de hoje para esse motorista/turno
                  const [viagem] = await Viagem.findOrCreate({
                     where: {
                        data: hojeStr,
                        turno: turnoVoto,
                        motorista_id: grupoVoto.motorista_id
                     },
                     defaults: {
                        data: hojeStr,
                        turno: turnoVoto,
                        motorista_id: grupoVoto.motorista_id,
                        status: 'pendente'
                     }
                  });

                  // Mapeia a opção escolhida para status_ida e status_volta
                  const opcao = selectedOption.toLowerCase().trim();
                  let statusIda = 'ausente';
                  let statusVolta = 'ausente';

                  if (opcao.includes('ida e volta') || opcao.includes('ida & volta')) {
                     statusIda = 'confirmado';
                     statusVolta = 'confirmado';
                  } else if (opcao.includes('só ida') || opcao.includes('so ida')) {
                     statusIda = 'confirmado';
                     statusVolta = 'ausente';
                  } else if (opcao.includes('só volta') || opcao.includes('so volta')) {
                     statusIda = 'ausente';
                     statusVolta = 'confirmado';
                  } else if (opcao.includes('não vou') || opcao.includes('nao vou')) {
                     statusIda = 'ausente';
                     statusVolta = 'ausente';
                  }

                  // Upsert: atualiza se já votou, cria se é novo
                  const [vp, criado] = await ViagemPassageiro.findOrCreate({
                     where: { viagem_id: viagem.id, passageiro_id: passageiroVotante.id },
                     defaults: {
                        viagem_id: viagem.id,
                        passageiro_id: passageiroVotante.id,
                        status_ida: statusIda,
                        status_volta: statusVolta
                     }
                  });

                  if (!criado) {
                     // Atualiza se mudou o voto
                     vp.status_ida = statusIda;
                     vp.status_volta = statusVolta;
                     await vp.save();
                  }

                  console.log(`[Webhook] Voto registrado: ${passageiroVotante.nome} -> ida=${statusIda}, volta=${statusVolta} (Viagem #${viagem.id})`);

               } else {
                  console.log('[Webhook] Outro tipo de Message Update recebido. Ignorando...');
               }
            } catch (e) {
               console.warn('[Webhook] Falha ao ler PollUpdate', e.message);
            }
            */
         }

      } catch (error) {
         console.error('[Webhook] Erro critico no processamento do webhook:', error);
      }
   }

   _handlePollUpdate = async (payload) => {
      try {
         const updates = Array.isArray(payload) ? payload : [payload];

         for (const updateInfo of updates) {
            if (!updateInfo) continue;

            const voteState = this._extractPollVoteState(updateInfo);
            if (!voteState.hasVote) {
               console.log('[Webhook] PollUpdate sem payload de voto acionavel. Ignorando...');
               continue;
            }

            const groupJid = this._resolvePollGroupJid(updateInfo);
            const voterJid = this._resolvePollVoterJid(updateInfo);

            if (!groupJid || !voterJid) {
               console.log(`[Webhook] PollUpdate sem grupo ou votante. group=${groupJid || 'N/A'} voter=${voterJid || 'N/A'}`);
               continue;
            }

            const passageiroVotante = await Passageiro.findOne({
               where: { telefone_responsavel: voterJid, onboarding_step: 'CONCLUIDO' }
            });

            if (!passageiroVotante) {
               console.log(`[Webhook] Passageiro ${voterJid} nao encontrado ou onboarding incompleto. Voto ignorado.`);
               continue;
            }

            const grupoVoto = await GrupoMotorista.findOne({ where: { group_jid: groupJid } });
            if (!grupoVoto) {
               console.log(`[Webhook] Grupo ${groupJid} nao encontrado no sistema. Voto ignorado.`);
               continue;
            }

            const Viagem = require('../models/Viagem');
            const ViagemPassageiro = require('../models/ViagemPassageiro');
            const turnoVoto = this._resolveTurnoVoto();
            const hojeStr = new Date().toISOString().split('T')[0];

            const [viagem] = await Viagem.findOrCreate({
               where: {
                  data: hojeStr,
                  turno: turnoVoto,
                  motorista_id: grupoVoto.motorista_id
               },
               defaults: {
                  data: hojeStr,
                  turno: turnoVoto,
                  motorista_id: grupoVoto.motorista_id,
                  status: 'pendente'
               }
            });

            const registroExistente = await ViagemPassageiro.findOne({
               where: { viagem_id: viagem.id, passageiro_id: passageiroVotante.id }
            });

            if (!voteState.hasSelection) {
               if (!registroExistente) {
                  console.log(`[Webhook] Deselecao de enquete sem voto previo para ${passageiroVotante.nome}. Ignorando.`);
                  continue;
               }

               const clearedStatuses = this._clearPollVoteStatuses(registroExistente);
               const houveMudanca =
                  registroExistente.status_ida !== clearedStatuses.statusIda ||
                  registroExistente.status_volta !== clearedStatuses.statusVolta ||
                  (clearedStatuses.clearRouteOrder && registroExistente.ordem_rota !== null);

               if (!houveMudanca) {
                  console.log(`[Webhook] Deselecao de enquete sem alteracao efetiva para ${passageiroVotante.nome}.`);
                  continue;
               }

               registroExistente.status_ida = clearedStatuses.statusIda;
               registroExistente.status_volta = clearedStatuses.statusVolta;
               if (clearedStatuses.clearRouteOrder) {
                  registroExistente.ordem_rota = null;
               }
               await registroExistente.save();

               console.log(`[Webhook] Voto removido: ${passageiroVotante.nome} -> ida=${clearedStatuses.statusIda}, volta=${clearedStatuses.statusVolta} (Viagem #${viagem.id})`);
               continue;
            }

            const selectedOption = voteState.selectedOption;
            if (!selectedOption) {
               console.log('[Webhook] PollUpdate com selecao invalida. Ignorando...');
               continue;
            }
            console.log(`[Webhook] Recebeu voto de enquete: ${selectedOption} | voter=${voterJid} | group=${groupJid}`);

            const { statusIda, statusVolta } = this._mapPollOptionToStatuses(selectedOption);

            if (!registroExistente) {
               await ViagemPassageiro.create({
                  viagem_id: viagem.id,
                  passageiro_id: passageiroVotante.id,
                  status_ida: statusIda,
                  status_volta: statusVolta
               });
            } else {
               registroExistente.status_ida = statusIda;
               registroExistente.status_volta = statusVolta;
               await registroExistente.save();
            }

            console.log(`[Webhook] Voto registrado: ${passageiroVotante.nome} -> ida=${statusIda}, volta=${statusVolta} (Viagem #${viagem.id})`);
         }
      } catch (e) {
         console.warn('[Webhook] Falha ao processar PollUpdate:', e.message);
      }
   }

   _extractPollVoteState(updateInfo) {
      const directState = this._extractPollVoteStateFromVote(updateInfo.message?.pollUpdateMessage?.vote);
      if (directState) {
         return directState;
      }

      const pollUpdates = updateInfo.update?.pollUpdates;
      if (Array.isArray(pollUpdates)) {
         for (const pollUpdate of pollUpdates) {
            const state = this._extractPollVoteStateFromVote(pollUpdate?.vote);
            if (state) {
               return state;
            }
         }
      }

      return { hasVote: false, hasSelection: false, selectedOption: null };
   }

   _containsPollVotePayload(payload) {
      const updates = Array.isArray(payload) ? payload : [payload];

      return updates.some(updateInfo => {
         if (!updateInfo || typeof updateInfo !== 'object') {
            return false;
         }

         if (this._extractPollVoteStateFromVote(updateInfo.message?.pollUpdateMessage?.vote)) {
            return true;
         }

         const pollUpdates = updateInfo.update?.pollUpdates;
         return Array.isArray(pollUpdates) && pollUpdates.some(pollUpdate =>
            Boolean(this._extractPollVoteStateFromVote(pollUpdate?.vote))
         );
      });
   }

   _extractPollVoteStateFromVote(vote) {
      if (!vote || !Array.isArray(vote.selectedOptions)) {
         return null;
      }

      if (vote.selectedOptions.length === 0) {
         return { hasVote: true, hasSelection: false, selectedOption: null };
      }

      return {
         hasVote: true,
         hasSelection: true,
         selectedOption: this._formatPollOption(vote.selectedOptions[0])
      };
   }

   _formatPollOption(option) {
      if (!option) return null;
      if (typeof option === 'string') return option;
      return option.optionName || option.name || option.text || String(option);
   }

   _resolvePollGroupJid(updateInfo) {
      return updateInfo.key?.remoteJid ||
         updateInfo.message?.pollUpdateMessage?.pollCreationMessageKey?.remoteJid ||
         updateInfo.pollCreationMessageKey?.remoteJid ||
         null;
   }

   _resolvePollVoterJid(updateInfo) {
      const rawVoter = updateInfo.key?.participantAlt ||
         updateInfo.participantAlt ||
         updateInfo.key?.participantPn ||
         updateInfo.participantPn ||
         updateInfo.key?.participant ||
         updateInfo.participant ||
         updateInfo.key?.remoteJid ||
         null;

      return rawVoter ? normalizePhone(rawVoter) : null;
   }

   _resolveTurnoVoto() {
      const horaAtual = new Date().getHours();
      if (horaAtual >= 10 && horaAtual < 16) return 'tarde';
      if (horaAtual >= 16) return 'noite';
      return 'manha';
   }

   async _handlePrivateRideConfirmation(passageiro, remoteJid, textMessage) {
      const selection = this._extractPrivateRideConfirmation(textMessage);
      if (!selection) {
         return false;
      }

      if (!passageiro.motorista_id) {
         await EvolutionService.sendMessage(
            remoteJid,
            `⚠️ ${passageiro.nome}, nao consegui localizar o motorista responsavel pelo seu cadastro. Fale direto com a van para combinar hoje.`
         );
         return true;
      }

      const { Op } = require('sequelize');
      const Viagem = require('../models/Viagem');
      const ViagemPassageiro = require('../models/ViagemPassageiro');
      const hojeStr = new Date().toISOString().split('T')[0];
      const turnoAlvo = this._resolveTurnoPassageiroPrivado(passageiro);

      let viagem = await Viagem.findOne({
         where: {
            data: hojeStr,
            motorista_id: passageiro.motorista_id,
            turno: turnoAlvo,
            status: { [Op.ne]: 'finalizada' }
         },
         order: [['updatedAt', 'DESC'], ['id', 'DESC']]
      });

      if (!viagem) {
         viagem = await Viagem.findOne({
            where: {
               data: hojeStr,
               motorista_id: passageiro.motorista_id,
               status: { [Op.ne]: 'finalizada' }
            },
            order: [['updatedAt', 'DESC'], ['id', 'DESC']]
         });
      }

      const viagemJaExistia = Boolean(viagem);
      if (!viagem) {
         viagem = await Viagem.create({
            data: hojeStr,
            turno: turnoAlvo,
            motorista_id: passageiro.motorista_id,
            status: 'pendente'
         });
      }

      const [vp, criado] = await ViagemPassageiro.findOrCreate({
         where: { viagem_id: viagem.id, passageiro_id: passageiro.id },
         defaults: {
            viagem_id: viagem.id,
            passageiro_id: passageiro.id,
            status_ida: selection.statusIda,
            status_volta: selection.statusVolta
         }
      });

      const jaEstavaRegistrado =
         !criado &&
         vp.status_ida === selection.statusIda &&
         vp.status_volta === selection.statusVolta;

      if (!criado && !jaEstavaRegistrado) {
         vp.status_ida = selection.statusIda;
         vp.status_volta = selection.statusVolta;
         await vp.save();
      }

      const trechoLabel = this._formatTrechoLabel(selection.trecho);
      const precisaAvisarMotorista = !viagemJaExistia || viagem.status === 'rota_gerada' || viagem.status === 'em_andamento';

      if (jaEstavaRegistrado) {
         await EvolutionService.sendMessage(
            remoteJid,
            `✅ ${passageiro.nome}, sua presenca de *${trechoLabel}* para hoje ja estava registrada aqui.`
         );
         return true;
      }

      if (precisaAvisarMotorista) {
         const motorista = await Motorista.findByPk(passageiro.motorista_id);
         if (motorista?.telefone) {
            const motivo = !viagemJaExistia
               ? 'Nao havia uma viagem aberta para esse turno.'
               : 'A lista do turno ja tinha sido fechada.';

            await EvolutionService.sendMessage(
               motorista.telefone,
               `⚠️ *Confirmacao no privado*\n\n${passageiro.nome} confirmou *${trechoLabel}* pelo privado para hoje.\nTurno: *${String(viagem.turno || turnoAlvo).toUpperCase()}*.\n\n${motivo}\nRevise a rota manualmente no painel.`
            );

            await this._recalculateAndSendUpdatedRoutesToDriver(motorista, viagem, passageiro, selection);
         }

         await EvolutionService.sendMessage(
            remoteJid,
            `✅ Anotado, *${passageiro.nome}*! Atualizei sua presenca de *${trechoLabel}* para hoje, recalculei a rota e enviei a ordem nova para o motorista.`
         );
      } else {
         await EvolutionService.sendMessage(
            remoteJid,
            `✅ Anotado, *${passageiro.nome}*! Registrei sua presenca de *${trechoLabel}* para hoje.`
         );
      }

      console.log(`[Webhook] Confirmacao privada registrada: ${passageiro.nome} -> ida=${selection.statusIda}, volta=${selection.statusVolta} (Viagem #${viagem.id})`);
      return true;
   }

   async _recalculateAndSendUpdatedRoutesToDriver(motorista, viagem, passageiroNovo, selection) {
      const trechos = [];
      if (selection.statusIda === 'confirmado') trechos.push('ida');
      if (selection.statusVolta === 'confirmado') trechos.push('volta');

      for (const trecho of trechos) {
         const persistOrder = this._shouldPersistRecalculatedOrder(viagem, selection, trecho);
         const resultado = await this._recalculateTripRouteForTrecho(motorista, viagem, trecho, passageiroNovo, selection.trecho, persistOrder);
         if (!resultado?.mensagem) continue;
         await EvolutionService.sendMessage(motorista.telefone, resultado.mensagem);
      }
   }

   async _recalculateTripRouteForTrecho(motorista, viagem, trecho, passageiroNovo, trechoConfirmado, persistOrder) {
      const { ViagemPassageiro, Passageiro, Endereco } = require('../models');
      const RoutingService = require('../services/RoutingService');
      const registros = await ViagemPassageiro.findAll({
         where: { viagem_id: viagem.id },
         include: [{
            model: Passageiro,
            include: [
               { model: Endereco, as: 'enderecoIda' },
               { model: Endereco, as: 'enderecoVolta' }
            ]
         }],
         order: [['ordem_rota', 'ASC'], ['id', 'ASC']]
      });

      const statusField = trecho === 'ida' ? 'status_ida' : 'status_volta';
      const candidatos = registros
         .filter(registro => this._isRerouteCandidate(registro[statusField]) && registro.Passageiro)
         .map(registro => {
            const passageiro = registro.Passageiro;
            const endereco = trecho === 'ida' ? passageiro.enderecoIda : passageiro.enderecoVolta;
            return {
               registro,
               passageiro,
               latitude: endereco?.latitude ?? passageiro.latitude,
               longitude: endereco?.longitude ?? passageiro.longitude,
               enderecoFormatado: endereco?.endereco_completo || passageiro.logradouro || passageiro.bairro || 'Endereço não informado'
            };
         });

      if (candidatos.length === 0) {
         return null;
      }

      const comCoordenadas = candidatos.filter(c => Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)));
      const semCoordenadas = candidatos.filter(c => !Number.isFinite(Number(c.latitude)) || !Number.isFinite(Number(c.longitude)));
      const origem = this._resolveRecalculationStartCoords(motorista, viagem, trecho, registros);

      let ordenados = [];
      if (comCoordenadas.length > 0) {
         const resultado = RoutingService.calculateOptimalRoute(
            comCoordenadas.map(c => ({
               latitude: Number(c.latitude),
               longitude: Number(c.longitude),
               nome: c.passageiro.nome,
               enderecoFormatado: c.enderecoFormatado,
               registroId: c.registro.id
            })),
            origem
         );

         const porRegistroId = new Map(comCoordenadas.map(c => [c.registro.id, c]));
         ordenados = resultado.orderedPath
            .map(item => porRegistroId.get(item.registroId))
            .filter(Boolean);
      }

      const registrosOrdenados = [...ordenados, ...semCoordenadas];

      if (persistOrder) {
         for (let i = 0; i < registrosOrdenados.length; i++) {
            const registro = registrosOrdenados[i].registro;
            registro.ordem_rota = i + 1;
            await registro.save();
         }
      }

      return {
         mensagem: this._buildRecalculatedRouteMessage(viagem, trecho, registrosOrdenados, passageiroNovo, trechoConfirmado, semCoordenadas.length > 0)
      };
   }

   _buildRecalculatedRouteMessage(viagem, trecho, registrosOrdenados, passageiroNovo, trechoConfirmado, temSemCoordenadas) {
      if (registrosOrdenados.length === 0) {
         return null;
      }

      const turno = String(viagem.turno || '').toUpperCase() || 'TURNO';
      const tituloTrecho = trecho === 'ida' ? 'IDA' : 'VOLTA';
      const origem = trecho === 'ida' ? '1. 🏠 Base' : '1. 🏫 Escola';
      const destino = trecho === 'ida' ? '🏫 Destino final: escola' : '🏠 Retorno: base';
      const lista = registrosOrdenados
         .map((item, index) => {
            const passageiro = item.passageiro;
            const marcadorNovo = passageiro.id === passageiroNovo.id ? ' 🆕' : '';
            const marcadorGeo = (!Number.isFinite(Number(item.latitude)) || !Number.isFinite(Number(item.longitude))) ? ' (sem geocode)' : '';
            return `${index + 2}. ${passageiro.nome}${marcadorNovo} - 📍${item.enderecoFormatado}${marcadorGeo}`;
         })
         .join('\n');

      const observacaoGeo = temSemCoordenadas
         ? `\n\n⚠️ Alguns pontos ficaram sem geocode e foram mantidos no fim da lista.`
         : '';

      return `🔄 *ROTA RECALCULADA - ${tituloTrecho} ${turno}*\nAjuste no privado: *${passageiroNovo.nome}* confirmou *${this._formatTrechoLabel(trechoConfirmado)}*.\n\n👥 ${registrosOrdenados.length} passageiro(s) nesse trecho\n\n${origem}\n${lista}\n${destino}${observacaoGeo}`;
   }

   _resolveRecalculationStartCoords(motorista, viagem, trecho, registros) {
      const fallbackBase = {
         lat: Number(motorista?.latitude) || -23.55052,
         lng: Number(motorista?.longitude) || -46.633308
      };

      if (viagem.status === 'em_andamento' && viagem.trecho_ativo === trecho) {
         const statusField = trecho === 'ida' ? 'status_ida' : 'status_volta';
         const recolhidos = registros
            .filter(registro => registro[statusField] === 'recolhido' && registro.Passageiro)
            .sort((a, b) => (b.ordem_rota || 0) - (a.ordem_rota || 0));

         for (const registro of recolhidos) {
            const passageiro = registro.Passageiro;
            const endereco = trecho === 'ida' ? passageiro.enderecoIda : passageiro.enderecoVolta;
            const lat = Number(endereco?.latitude ?? passageiro.latitude);
            const lng = Number(endereco?.longitude ?? passageiro.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
               return { lat, lng };
            }
         }
      }

      if (trecho === 'volta') {
         const escolaLat = Number(motorista?.escola_latitude);
         const escolaLng = Number(motorista?.escola_longitude);
         if (Number.isFinite(escolaLat) && Number.isFinite(escolaLng)) {
            return { lat: escolaLat, lng: escolaLng };
         }
      }

      return fallbackBase;
   }

   _shouldPersistRecalculatedOrder(viagem, selection, trecho) {
      if (selection.trecho === trecho) return true;
      if (selection.trecho !== 'ambos') return false;
      if (viagem.trecho_ativo) return viagem.trecho_ativo === trecho;
      return trecho === 'ida';
   }

   _isRerouteCandidate(status) {
      return status === 'confirmado' || status === 'em_rota';
   }

   _extractPrivateRideConfirmation(textMessage) {
      const text = this._normalizeComparableText(textMessage);
      if (!text) return null;

      const futureMarkers = ['amanha', 'depois de amanha', 'semana que vem', 'mes que vem'];
      if (futureMarkers.some(marker => text.includes(marker))) {
         return null;
      }

      const negativeMarkers = [
         'nao vou',
         'nao irei',
         'nao volto',
         'nao vou voltar',
         'nao vou ir',
         'cancela ida',
         'cancela volta',
         'cancela tudo',
         'sem ida',
         'sem volta'
      ];
      if (negativeMarkers.some(marker => text.includes(marker))) {
         return null;
      }

      const explicitBothMarkers = [
         'ida e volta',
         'vou e volto',
         'ambos trechos',
         'os dois trechos'
      ];
      const explicitBoth = explicitBothMarkers.some(marker => text.includes(marker));
      const explicitIda = /(?:^|\s)(so|apenas|somente) ida(?:\s|$)/.test(text);
      const explicitVolta = /(?:^|\s)(so|apenas|somente) volta(?:\s|$)/.test(text);

      const mentionsIda =
         explicitIda ||
         /\bida\b/.test(text);

      const mentionsVolta =
         explicitVolta ||
         /\bvolta\b/.test(text) ||
         text.includes('volto');

      const affirmativeMarkers = [
         'vou',
         'irei',
         'confirmo',
         'confirmo presenca',
         'presenca confirmada',
         'me coloca',
         'me adiciona',
         'me adicione',
         'me inclui',
         'me inclua',
         'pode me colocar',
         'pode me adicionar',
         'conta comigo',
         'vou usar a van',
         'preciso da van'
      ];
      const affirmative = affirmativeMarkers.some(marker => text.includes(marker));

      if (!affirmative && !explicitBoth && !explicitIda && !explicitVolta) {
         return null;
      }

      if (explicitBoth || (mentionsIda && mentionsVolta) || (!mentionsIda && !mentionsVolta)) {
         return { trecho: 'ambos', statusIda: 'confirmado', statusVolta: 'confirmado' };
      }

      if (mentionsIda) {
         return { trecho: 'ida', statusIda: 'confirmado', statusVolta: 'ausente' };
      }

      if (mentionsVolta) {
         return { trecho: 'volta', statusIda: 'ausente', statusVolta: 'confirmado' };
      }

      return null;
   }

   _resolveTurnoPassageiroPrivado(passageiro) {
      const turnoAtual = this._resolveTurnoVoto();
      const turnoPassageiro = this._normalizeComparableText(passageiro?.turno || '');

      if (!turnoPassageiro) {
         return turnoAtual;
      }

      if (turnoPassageiro.includes('tarde')) return 'tarde';
      if (turnoPassageiro.includes('noite')) return 'noite';
      if (turnoPassageiro.includes('manha')) return 'manha';

      return turnoAtual;
   }

   _formatTrechoLabel(trecho) {
      if (trecho === 'ida') return 'ida';
      if (trecho === 'volta') return 'volta';
      return 'ida e volta';
   }

   _normalizeComparableText(value) {
      return String(value || '')
         .toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[^\w\s]+/g, ' ')
         .replace(/\s+/g, ' ')
         .trim();
   }

   _clearPollVoteStatuses(registro) {
      const nextStatusIda = this._isPollDrivenStatus(registro?.status_ida) ? 'aguardando_resposta' : registro?.status_ida;
      const nextStatusVolta = this._isPollDrivenStatus(registro?.status_volta) ? 'aguardando_resposta' : registro?.status_volta;
      const clearRouteOrder = !this._isRouteActiveStatus(nextStatusIda) && !this._isRouteActiveStatus(nextStatusVolta);

      return {
         statusIda: nextStatusIda,
         statusVolta: nextStatusVolta,
         clearRouteOrder
      };
   }

   _isPollDrivenStatus(status) {
      return status === 'aguardando_resposta' ||
         status === 'confirmado' ||
         status === 'ausente' ||
         status === 'em_rota';
   }

   _isRouteActiveStatus(status) {
      return status === 'confirmado' || status === 'em_rota' || status === 'recolhido' || status === 'entregue';
   }

   _mapPollOptionToStatuses(selectedOption) {
      const opcao = String(selectedOption)
         .toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[^\w&]+/g, ' ')
         .replace(/\s+/g, ' ')
         .trim();
      let statusIda = 'ausente';
      let statusVolta = 'ausente';

      if (opcao.includes('ida') && opcao.includes('volta')) {
         statusIda = 'confirmado';
         statusVolta = 'confirmado';
      } else if (opcao.includes('ida')) {
         statusIda = 'confirmado';
      } else if (opcao.includes('volta')) {
         statusVolta = 'confirmado';
      }

      return { statusIda, statusVolta };
   }

   /**
    * Trata o evento groups.upsert da Evolution API v2.
    * Esse evento dispara quando o bot é adicionado a um grupo novo.
    * O payload contém os metadados do grupo: id, subject, participants[], subjectOwner, subjectOwnerPn, etc.
    */
   _handleGroupsUpsert = async (data) => {
      try {
         // data pode ser um objeto ou um array de grupos
         const groups = Array.isArray(data) ? data : [data];

         for (const groupInfo of groups) {
            if (!groupInfo || !groupInfo.id) {
               console.log('[Groups.Upsert] Payload sem ID de grupo, ignorando.');
               continue;
            }

            const groupJid = groupInfo.id;
            const groupName = groupInfo.subject || 'Grupo sem nome';

            console.log(`[Groups.Upsert] Bot adicionado ao grupo "${groupName}" (${groupJid})`);

            // Identifica quem criou/adicionou o bot ao grupo.
            // Na v2, o campo subjectOwnerPn contém o telefone real (JID padrão)
            // e subjectOwner pode ser um LID. Também podemos olhar participants[].
            let authorPhone = groupInfo.subjectOwnerPn || groupInfo.subjectOwner || null;

            // Se não veio nos campos de subject, tenta achar nos participantes
            // (o admin do grupo geralmente é o primeiro participante com role 'superadmin' ou 'admin')
            if ((!authorPhone || authorPhone.endsWith('@lid')) && Array.isArray(groupInfo.participants)) {
               const admin = groupInfo.participants.find(p => p.admin === 'superadmin' || p.admin === 'admin');
               if (admin) {
                  // Usa o JID padrão se disponível
                  authorPhone = admin.pn || admin.id || authorPhone;
               }
            }

            if (!authorPhone) {
               console.log(`[Groups.Upsert] Não foi possível identificar o dono do grupo ${groupJid}. Ignorando.`);
               continue;
            }

            console.log(`[Groups.Upsert] Dono/criador identificado: ${authorPhone}`);

            // Normaliza o telefone para buscar no banco
            const normalizedAuthor = normalizePhone(authorPhone);

            // Verifica se é um motorista pagante ativo
            const motorista = await Motorista.findOne({ where: { telefone: normalizedAuthor, status: 'ativo' } });

            if (motorista) {
               // Vincula o grupo ao motorista
               const [grupo, created] = await GrupoMotorista.findOrCreate({
                  where: { group_jid: groupJid },
                  defaults: { motorista_id: motorista.id, group_jid: groupJid, nome_grupo: groupName }
               });

               if (created) {
                  console.log(`[Groups.Upsert] ✅ Grupo "${groupName}" vinculado ao motorista ${motorista.nome} (ID ${motorista.id})`);
                  const botPhone = process.env.BOT_PHONE_NUMBER || '5511999999999';
                  const linkMagico = `https://wa.me/${botPhone}?text=VAN%20${motorista.id}`;
                  await EvolutionService.sendMessage(groupJid, `🚐 *Olá pessoal! Sou o assistente virtual da Van do(a) ${motorista.nome}.*\n\nPara organizarmos as rotas diárias com inteligência artificial, cliquem no link abaixo para iniciar o cadastro no meu privado:\n\n👉 ${linkMagico}\n\nLá irei pedir Nome, Turno e Endereços rapidinho!`);
               } else {
                  console.log(`[Groups.Upsert] Grupo ${groupJid} já existe no sistema.`);
               }
            } else {
               // Não é motorista ativo â€” sai do grupo se não for conhecido
               const grupoConhecido = await GrupoMotorista.findOne({ where: { group_jid: groupJid } });
               if (!grupoConhecido) {
                  console.log(`[Groups.Upsert] Bot adicionado a grupo desconhecido por ${authorPhone}. Saindo!`);
                  await EvolutionService.leaveGroup(groupJid);
               }
            }
         }
      } catch (error) {
         console.error('[Groups.Upsert] âŒ Erro ao processar groups.upsert:', error.message || error);
      }
   }

   /**
    * Trata o evento group-participants.update da Evolution API v2.
    * Na v2, o payload tem a estrutura:
    * {
    *   action: 'add' | 'remove' | 'promote' | 'demote',
    *   participants: ['5511...@s.whatsapp.net'],
    *   metadata: { groupJid: '120363...@g.us', author: '5511...@s.whatsapp.net' }
    * }
    * OU (dependendo da versão):
    * {
    *   id: '120363...@g.us',
    *   action: 'add',
    *   author: '5511...@s.whatsapp.net',
    *   participants: ['5511...@s.whatsapp.net']
    * }
    */
   _handleGroupParticipantsUpdate = async (data) => {
      try {
         if (!data) return;

         // Compatibilidade com diferentes formatos da Evolution v1/v2
         const action = data.action;
         const participants = data.participants || [];

         // groupJid pode estar em data.metadata.groupJid (v2) ou data.id (v1)
         const remoteJid = data.metadata?.groupJid || data.id;

         // author pode estar em data.metadata.author (v2) ou data.author (v1)
         // Pode ser um LID, então tentamos também o campo alternativo
         let author = data.metadata?.author || data.author;
         const authorAlt = data.metadata?.sender || data.authorPn;

         // Se o author for um LID, usa o alternativo se disponível
         if (author && author.endsWith('@lid') && authorAlt) {
            author = authorAlt;
         }

         console.log(`[Group Participants] Evento "${action}" no grupo ${remoteJid}, author: ${author}, participants: ${JSON.stringify(participants)}`);

         if (!remoteJid) return;

         // Se o bot foi REMOVIDO do grupo, limpa do banco de dados
         if (action === 'remove') {
            const botPhone = process.env.BOT_PHONE_NUMBER || '5511999999999';
            const botJid = botPhone + '@s.whatsapp.net';
            // Checa se o bot esta na lista de participantes removidos
            const botRemoved = participants.some(p => {
               const normalized = normalizePhone(p);
               return normalized === botJid || p.includes(botPhone);
            });

            if (botRemoved) {
               const grupoRemovido = await GrupoMotorista.findOne({ where: { group_jid: remoteJid } });
               if (grupoRemovido) {
                  await grupoRemovido.destroy();
                  console.log('[Group Participants] Bot removido do grupo ' + remoteJid + '. Registro deletado do banco.');
               } else {
                  console.log('[Group Participants] Bot removido do grupo ' + remoteJid + ', mas nao estava no banco.');
               }
            }
            return;
         }

         if (action !== 'add' || !author) {
            return;
         }

         // Normaliza o telefone do author para buscar no banco
         const normalizedAuthor = normalizePhone(author);

         // Checa se o usuário que disparou isso é nosso motorista pagante ativo
         const motorista = await Motorista.findOne({ where: { telefone: normalizedAuthor, status: 'ativo' } });

         if (motorista) {
            // Valida se o grupo já tá rastreado, senão cria e avisa!
            const [grupo, created] = await GrupoMotorista.findOrCreate({
               where: { group_jid: remoteJid },
               defaults: { motorista_id: motorista.id, group_jid: remoteJid }
            });
            if (created) {
               console.log(`[Group Participants] ✅ Grupo ${remoteJid} vinculado ao motorista ${motorista.nome}`);
               const botPhone = process.env.BOT_PHONE_NUMBER || '5511999999999';
               const linkMagico = `https://wa.me/${botPhone}?text=VAN%20${motorista.id}`;
               await EvolutionService.sendMessage(remoteJid, `🚐 *Olá pessoal! Sou o assistente virtual da Van do(a) ${motorista.nome}.*\n\nPara organizarmos as rotas diárias com inteligência artificial, cliquem no link abaixo para iniciar o cadastro no meu privado:\n\n👉 ${linkMagico}\n\nLá irei pedir Nome, Turno e Endereços rapidinho!`);
            }
         } else {
            // Autor que adicionou não é motorista e/ou não tá ativo. Vamos sair se não tivermos esse grupo rodando.
            const grupoConhecido = await GrupoMotorista.findOne({ where: { group_jid: remoteJid } });
            if (!grupoConhecido) {
               console.log(`[Group Participants] Adicionado em grupo pirata/anônimo por ${author}. Saindo!`);
               await EvolutionService.leaveGroup(remoteJid);
            }
         }
      } catch (error) {
         console.error('[Group Participants] âŒ Erro ao processar group-participants.update:', error.message || error);
      }
   }
}

module.exports = new WebhookController();
