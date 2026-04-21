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

// Cache simples para evitar processamento duplicado (Evolution API as vezes repete o webhook)
const processedMessages = new Set();
const CACHE_LIMIT = 500; // Limite de IDs para nÃ£o crescer infinitamente

class WebhookController {

   handleEvolutionAPI = async (req, res) => {
      try {
         const body = req.body;
         if (!body) return res.status(400).send('Payload vazio');

         const event = body.event;
         const instance = body.instance;

         // Responde logo ao webhook (200 OK) para evitar re-envio por timeout
         res.status(200).send({ status: 'received' });

         // VerificaÃ§Ã£o de duplicidade por ID de mensagem (se disponÃ­vel no payload)
         const msgId = body.data?.key?.id || (Array.isArray(body.data) && body.data[0]?.key?.id);
         if (msgId) {
            if (processedMessages.has(msgId)) {
               return;
            }
            processedMessages.add(msgId);

            // MantÃ©m o cache sob controle
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
            'groups.upsert', 'GROUPS_UPSERT'
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
            console.log('[Webhook] ⚠️ Nenhuma mensagem encontrada no campo data para evento de mensagem.');
            return;
         }

         for (const data of messages) {
            console.log("[DEBUG] Processando mensagem:", JSON.stringify(data).substring(0, 200));

            const remoteJid = data.key?.remoteJid;
            const participant = data.key?.participant || remoteJid; // For groups, sender is participant
            const isFromMe = data.key?.fromMe;
            const isGroup = remoteJid?.endsWith('@g.us');
            let textMessage = data.message?.conversation || data.message?.extendedTextMessage?.text || '';

            if (isFromMe || !remoteJid) continue;

            console.log(`[Webhook] Mensagem recebida de ${remoteJid}`);

            // 1. Tratativa de Arquivos e Fotos (Para Comprovantes) e Ãudios (Para Whisper STT)
            const messageKeys = data.message ? Object.keys(data.message) : [];
            const msgType = messageKeys.find(key => key === 'audioMessage' || key === 'imageMessage' || key === 'documentMessage' || key === 'videoMessage') || messageKeys[0];

            // Tratamento EspecÃ­fico para Voice Notes (Ãudios do Motorista)
            if (msgType === 'audioMessage') {
               let base64ToUse = data.base64;

               if (!base64ToUse) {
                  console.log(`[Audio] ðŸŽ™ï¸ Base64 ausente, baixando da API para a mensagem ${data.key.id}...`);
                  base64ToUse = await EvolutionService.getMediaBase64(data.key.id);
               }

               if (base64ToUse) {
                  console.log(`[Audio] Ãudio pronto para ${remoteJid}, iniciando conversÃ£o e Whisper STT Local...`);
                  try {
                     const AudioTranscriptionService = require('../services/AudioTranscriptionService');
                     const textoTranscrito = await AudioTranscriptionService.transcribeAudioBase64(base64ToUse);

                     if (!textoTranscrito || textoTranscrito.trim() === '') {
                        console.log(`[Audio] Ãudio ininteligÃ­vel ou vazio ignorado.`);
                        return;
                     }

                     console.log(`[Audio] STT finalizou. Texto transcrito: "${textoTranscrito}"`);

                     // FINGE ser uma mensagem de texto para o funil fluir nas IA's normais lÃ¡ para baixo
                     textMessage = textoTranscrito;
                  } catch (e) {
                     console.error('[Audio] Erro na transcriÃ§Ã£o STT:', e);
                     return; // Impede que o fluxo vÃ¡ pra frente com a variÃ¡vel textMessage vazia
                  }
               } else {
                  console.warn(`[Audio] Ãudio detectado de ${remoteJid}, mas sem conteÃºdo Base64. Verifique se o envio de Base64 estÃ¡ ativado nas configuraÃ§Ãµes do Webhook da sua instÃ¢ncia Evolution.`);
                  return;
               }
            }
            // Tratamento Atualizado de Mídias/Imagens para Recibos
            else if (msgType === 'imageMessage' || msgType === 'documentMessage') {
               console.log(`[Financeiro] 📷 Imagem/Documento recebido de ${remoteJid}. Possível comprovante de passageiro.`);
               let hasBase64 = data.base64 || data.message?.base64;

               if (!hasBase64) {
                  console.log(`[Financeiro] 📥 Base64 ausente no webhook. Baixando arquivo da API para análise do robô...`);
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
                                 const texto = `âš ï¸ *Alerta Financeiro de ${passageiro.nome}*\nO valor cobrado era R$ ${fin.valor_mensalidade}, mas o PIX parece ter sido de R$ ${analise.value}.\nDetalhe IA: ${analise.details}\n\nVocÃª autoriza dar baixa nesse comprovante? Refuse ou Ajuste pelo painel!`;
                                 EvolutionService.sendMessage(motorista.telefone, texto);
                              }
                              EvolutionService.sendMessage(remoteJid, MessageVariation.financeiro.falha(passageiro.nome));
                           }
                        } else {
                           EvolutionService.sendMessage(remoteJid, 'ðŸ¤” VocÃª nÃ£o possui mensalidades pendentes cadastradas no meu sistema atual.');
                        }
                     }
                  }
                  return; // Bloqueia o arquivo de ir pro buffer do LLM text-only
               }
            }

            // 1.5 Tratamento de LocalizaÃ§Ã£o em Tempo Real (GPS Tracking)
            if (msgType === 'locationMessage' || msgType === 'liveLocationMessage') {
               const locData = data.message?.locationMessage || data.message?.liveLocationMessage;
               if (locData && locData.degreesLatitude && locData.degreesLongitude) {
                  const LiveTrackingService = require('../services/LiveTrackingService');
                  await LiveTrackingService.processLocationUpdate(
                     remoteJid,
                     locData.degreesLatitude,
                     locData.degreesLongitude
                  );
               }
               return; // LocalizaÃ§Ã£o nÃ£o vai pro funil de texto
            }

            // 1.6 FUNIL DE VENDAS PARA NOVOS MOTORISTAS (DESCONHECIDOS)
            const normalizedJid = normalizePhone(remoteJid);

            if (!isGroup) {
               const m = await Motorista.findOne({ where: { telefone: normalizedJid } });
               const p = await Passageiro.findOne({ where: { telefone_responsavel: normalizedJid } });

               // Se nÃ£o conhecemos esse nÃºmero de lugar nenhum, ou se ele jÃ¡ Ã© um LEAD
               if (!p && (!m || m.status === 'lead')) {
                  // A. NOVO LEAD (Primeiro contato)
                  if (!m) {
                     console.log(`[Vendas] Novo prospect: ${remoteJid}. Enviando Pitch.`);
                     await Motorista.create({ telefone: remoteJid, status: 'lead', venda_etapa: 'APRESENTACAO' });
                     await EvolutionService.sendMessage(remoteJid, SalesService.getPitch());
                     return;
                  }

                  // B. ETAPA: APRESENTACAO (Aguardando confirmacÃ£o de interesse)
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
                        console.log(`[Vendas] 📷 Imagem/Documento recebido (possível comprovante) do ${remoteJid}.`);

                        let hasBase64 = data.base64 || data.message?.base64;
                        if (!hasBase64) {
                           console.log(`[Vendas] 📥 Base64 ausente no webhook. Baixando mídia da API para o comprovante...`);
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
                              await EvolutionService.sendMessage(remoteJid, `âš ï¸ hmmm, nÃ£o consegui validar esse comprovante. Verifique o valor (R$ ${SalesService.MONTHLY_VALUE}) e tente mandar a imagem novamente.`);
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
                        m.status = 'ativo';
                        m.venda_etapa = 'CONCLUIDO';
                        m.boas_vindas_enviada = true;
                        await m.save();

                        await EvolutionService.sendMessage(remoteJid, LlmService.getDriverOnboardingMessage(m.nome));

                        // Manda as mensagens de tutorial e dicas
                        await EvolutionService.sendMessage(remoteJid, "Vou te enviar aqui embaixo também um breve tutorial com o resumo das minhas funções para você deixar salvo. 👇");
                        await EvolutionService.sendMessage(remoteJid, LlmService.getDriverTutorialMessage());

                        console.log(`[Vendas] ONBOARDING COMPLETO! Novo motorista: ${m.nome}`);
                        return;
                     } else {
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.onboardingMotorista.erroEndereco('escola'));
                        return;
                     }
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

                     EvolutionService.sendMessage(remoteJid, `ðŸ“ Processando coordenadas da garagem...`);

                     const coords = await GeocodeService.getCoordinates(enderecoBase);
                     if (coords) {
                        m.latitude = coords.lat;
                        m.longitude = coords.lng;
                        await m.save();
                        EvolutionService.sendMessage(remoteJid, `âœ… Garagem registrada nas coordenadas detectadas!\nA partir de agora usarei essa base para montar suas rotas.`);
                     } else {
                        EvolutionService.sendMessage(remoteJid, `âš ï¸ NÃ£o consegui achar o endereÃ§o no mapa. Mande algo mais completo. Exemplo:\ngaragem Rua XYZ, 110, Bairro - Cidade`);
                     }
                     return;
                  }

                  // A0b. Comando Escola (Destino da Rota - para aviso no grupo)
                  if (textMessage.toLowerCase().startsWith('escola ')) {
                     const GeocodeService = require('../services/GeocodeService');
                     const textoEscola = textMessage.substring(7).trim();

                     EvolutionService.sendMessage(remoteJid, `ðŸ« Processando localizaÃ§Ã£o da escola/faculdade...`);

                     const coords = await GeocodeService.getCoordinates(textoEscola);
                     if (coords) {
                        m.escola_nome = textoEscola.split(',')[0].trim() || textoEscola;
                        m.escola_latitude = coords.lat;
                        m.escola_longitude = coords.lng;
                        await m.save();
                        EvolutionService.sendMessage(remoteJid, `âœ… Escola/Faculdade registrada: *${m.escola_nome}*!\nQuando a van estiver chegando, vou avisar a galera no grupo automaticamente.`);
                     } else {
                        EvolutionService.sendMessage(remoteJid, `âš ï¸ NÃ£o achei esse endereÃ§o. Tenta algo mais completo. Exemplo:\nescola UFS, SÃ£o CristÃ³vÃ£o - SE`);
                     }
                     return;
                  }

                  // A. LotaÃ§Ã£o
                  if (textMessage.toLowerCase().startsWith('lotacao ')) {
                     const parts = textMessage.toLowerCase().split(' ');
                     if (parts.length === 3) {
                        const turno = parts[1].replace('Ã£', 'a'); // manha, tarde, noite
                        const valor = parseInt(parts[2]);
                        let alterado = false;
                        if (turno === 'manha') { m.meta_manha = valor; alterado = true; }
                        if (turno === 'tarde') { m.meta_tarde = valor; alterado = true; }
                        if (turno === 'noite') { m.meta_noite = valor; alterado = true; }

                        if (alterado) {
                           await m.save();
                           EvolutionService.sendMessage(remoteJid, `âœ… Capacidade do turno ${turno.toUpperCase()} definida para ${valor} alunos! Vou te avisar conforme eles forem entrando no sistema.`);
                        } else {
                           EvolutionService.sendMessage(remoteJid, `âš ï¸ Turno invÃ¡lido. Escreva: lotacao manha 15, lotacao tarde 10...`);
                        }
                        return;
                     }
                  }

                  // A2. Comando Raio (Configurar raio de notificaÃ§Ã£o GPS)
                  const raioMatch = textMessage.toLowerCase().trim().match(/^raio\s+(\d+\.?\d*)$/);
                  if (raioMatch) {
                     const kmValue = parseFloat(raioMatch[1]);
                     m.raio_notificacao = Math.round(kmValue * 1000); // Converte km para metros
                     await m.save();
                     EvolutionService.sendMessage(remoteJid, MessageVariation.rastreamento.raioAlterado(kmValue));
                     return;
                  }

                  // A3. Comando Iniciar Rota (Ativa rastreamento GPS)
                  const iniciarMatch = textMessage.toLowerCase().trim().match(/^iniciar\s+(rota|ida|volta)$/);
                  if (iniciarMatch) {
                     const Viagem = require('../models/Viagem');
                     const hojeStr = new Date().toISOString().split('T')[0];
                     const trechoSolicitado = iniciarMatch[1] === 'rota' ? 'ida' : iniciarMatch[1];

                     const viagem = await Viagem.findOne({
                        where: { motorista_id: m.id, data: hojeStr, status: 'rota_gerada' }
                     });

                     if (viagem) {
                        viagem.status = 'em_andamento';
                        viagem.trecho_ativo = trechoSolicitado;
                        viagem.parada_atual = 1;
                        await viagem.save();
                        EvolutionService.sendMessage(remoteJid, MessageVariation.rastreamento.pedirLocalizacao());
                     } else {
                        EvolutionService.sendMessage(remoteJid, `âš ï¸ NÃ£o encontrei nenhuma rota gerada pra hoje. As enquetes jÃ¡ fecharam?`);
                     }
                     return;
                  }

                  // B. Pausas Operacionais (FÃ©rias e Feriados via LLM)
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
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.pausas.confirmacao('FÃ©rias Prolongadas', pauseDetectado.endDate));
                     } else if (pauseDetectado.type === 'FERIAS_FIM') {
                        m.em_ferias = false;
                        m.pausa_inicio = null;
                        m.pausa_fim = null;
                        await m.save();
                        await EvolutionService.sendMessage(remoteJid, MessageVariation.pausas.retorno());
                     }
                     return; // Bloqueia propagaÃ§Ã£o
                  }

                  // C. LanÃ§amento de Gastos / Despesas (via LLM)
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

                     // Calcula o total gasto do mÃªs para retornar no feedback
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
                     return; // Bloqueia de ir pra fila genÃ©rica do bot
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
                        EvolutionService.sendMessage(participant, "ðŸ‘‹ OlÃ¡! Vi sua requisiÃ§Ã£o!\n*1. Qual o nome completo do aluno que irÃ¡ na Van?*");
                     } else {
                        EvolutionService.sendMessage(participant, "VocÃª jÃ¡ estÃ¡ com o cadastro concluÃ­do no sistema da van!");
                     }
                  }
               }
               return; // Don't process other group texts via NLP/Queue
            }

            // 3. Fila Privada (Chatbot de Onboarding)
            let passageiro = await Passageiro.findOne({ where: { telefone_responsavel: normalizedJid } });

            // -> Link MÃ¡gico: Captura "VAN <motoristaId>" vindo do link wa.me clicÃ¡vel
            const vanMatch = textMessage.toUpperCase().trim().match(/^VAN\s+(\d+)$/);
            if (!passageiro && vanMatch) {
               const motoristaId = parseInt(vanMatch[1]);
               const motoristaAlvo = await Motorista.findOne({ where: { id: motoristaId, status: 'ativo' } });

               if (!motoristaAlvo) {
                  EvolutionService.sendMessage(remoteJid, `âš ï¸ CÃ³digo de van invÃ¡lido ou expirado. PeÃ§a ao motorista para reenviar o link no grupo.`);
                  return;
               }

               passageiro = await Passageiro.create({
                  nome: 'Aguardando',
                  telefone_responsavel: normalizedJid,
                  onboarding_step: 'AGUARDANDO_NOME',
                  motorista_id: motoristaAlvo.id
               });
               console.log(`[Onboarding] Passageiro ${normalizedJid} vinculado ao motorista ${motoristaAlvo.nome} (ID ${motoristaAlvo.id}) via Link MÃ¡gico.`);
               EvolutionService.sendMessage(remoteJid, `ðŸ‘‹ OlÃ¡! Bem-vindo(a) ao *VANBORA*, o assistente inteligente da van do(a) *${motoristaAlvo.nome}*!\nVamos configurar a vaga do passageiro rapidinho.\n\n*1. Qual o nome completo do aluno que irÃ¡ na Van?*`);
               return;
            }

            if (passageiro && passageiro.onboarding_step !== 'CONCLUIDO') {
               const passo = passageiro.onboarding_step;
               console.log(`[Onboarding] Pessoas ${remoteJid} respondeu passo: ${passo}`);

               if (passo === 'AGUARDANDO_NOME') {
                  passageiro.nome = textMessage;
                  passageiro.onboarding_step = 'AGUARDANDO_TURNO';
                  await passageiro.save();
                  EvolutionService.sendMessage(remoteJid, `Perfeito! Aluno registrado: ${textMessage}.\n\n*2. Qual o turno que esse aluno estudarÃ¡?*\n(Ex: ManhÃ£, Tarde, Noite, Integral)`);
                  return;
               }
               if (passo === 'AGUARDANDO_TURNO') {
                  passageiro.turno = textMessage;
                  passageiro.onboarding_step = 'AGUARDANDO_ENDERECO';
                  await passageiro.save();
                  EvolutionService.sendMessage(remoteJid, `Ok, Turno ${textMessage}.\n\n*3. Agora preciso dos endereÃ§os de embarque.*\n\nSe o aluno embarca sempre no mesmo lugar, mande *um* endereÃ§o.\nSe ele tem mais de um local (ex: casa da mÃ£e e casa do pai), mande *um por linha*, comeÃ§ando com um apelido:\n\nExemplo:\nCasa da MÃ£e - Rua das Flores, 123, Centro\nCasa do Pai - Av. Brasil, 456, Jardim AmÃ©rica\n\nðŸ“ Mande todos agora numa mensagem sÃ³:`);
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
                     let apelido = `EndereÃ§o ${i + 1}`;
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
                  passageiro.onboarding_step = 'AGUARDANDO_MENSALIDADE';
                  await passageiro.save();

                  const msgConfirm = MessageVariation.enderecos.confirmacao(countCadastrados);
                  EvolutionService.sendMessage(remoteJid, msgConfirm);

                  // Pede a mensalidade com piadinha
                  setTimeout(() => {
                     EvolutionService.sendMessage(remoteJid, `*4. Ãšltima pergunta!* ðŸ’°\nQual o valor da sua mensalidade da van?\n\n(Ex: 250, 180.50)\n\nâš ï¸ _Esse valor serÃ¡ verificado pelo motorista, entÃ£o nem tenta colocar R$ 1,99 que nÃ£o cola nÃ£o, hein! ðŸ˜‚ðŸš_`);
                  }, 2000);
                  return;
               }
               if (passo === 'AGUARDANDO_MENSALIDADE') {
                  // Limpa o texto e tenta extrair um nÃºmero
                  const textoLimpo = textMessage.replace(/[rR]\$/, '').replace(/\s/g, '').replace(',', '.').trim();
                  const valor = parseFloat(textoLimpo);

                  if (isNaN(valor) || valor <= 0) {
                     EvolutionService.sendMessage(remoteJid, `ðŸ¤” NÃ£o entendi esse valor. Manda sÃ³ o nÃºmero, por favor!\nExemplo: *250* ou *180.50*`);
                     return;
                  }

                  passageiro.mensalidade = valor;
                  passageiro.onboarding_step = 'CONCLUIDO';
                  await passageiro.save();

                  EvolutionService.sendMessage(remoteJid, `âœ… *Cadastro finalizado com sucesso!* ðŸŽ‰\n\nðŸ“‹ *Resumo:*\nðŸ‘¤ ${passageiro.nome}\nðŸ• Turno: ${passageiro.turno}\nðŸ’° Mensalidade: R$ ${valor.toFixed(2)}\n\nAgora Ã© sÃ³ ficar de olho na enquete diÃ¡ria no grupo! ðŸš`);

                  // NotificaÃ§Ã£o de Meta para o Motorista ResponsÃ¡vel
                  const motorista_resp = await Motorista.findByPk(passageiro.motorista_id);
                  if (motorista_resp) {
                     const counts = await Passageiro.count({ where: { motorista_id: motorista_resp.id, turno: passageiro.turno, onboarding_step: 'CONCLUIDO' } });

                     let meta = 0;
                     const tStr = (passageiro.turno || '').toLowerCase().trim();
                     if (tStr.includes('manhÃ£') || tStr.includes('manha')) meta = motorista_resp.meta_manha;
                     else if (tStr.includes('tarde')) meta = motorista_resp.meta_tarde;
                     else if (tStr.includes('noite')) meta = motorista_resp.meta_noite;

                     let textMeta = '';
                     if (meta > 0) {
                        if (counts >= meta) textMeta = `(LOTAÃ‡ÃƒO COMPLETA! ðŸŽ‰ A van encheu!)`;
                        else textMeta = `(Faltam ${meta - counts} alunos para fechar a lista desse turno!)`;
                     }

                     const notifyText = `ðŸ”” *Novo Aluno a Bordo!*\n\nO(A) responsÃ¡vel/aluno *${passageiro.nome}* concluiu o auto-cadastro para o turno *${passageiro.turno}*.\nMensalidade informada: *R$ ${valor.toFixed(2)}*\n\nðŸ“Š *Resumo do Turno:* VocÃª tem ${counts} confirmados.\n${textMeta}`;
                     EvolutionService.sendMessage(motorista_resp.telefone, notifyText);
                  }

                  return;
               }
            } else if (passageiro && passageiro.onboarding_step === 'CONCLUIDO') {
               // 3.5 Cancelamento de Trecho via LLM (passageiro desiste da ida ou volta)
               const LlmServiceCancel = require('../services/LlmService');
               const cancelDetect = await LlmServiceCancel.parseRideCancellation(textMessage);

               if (cancelDetect && cancelDetect.isCancellation) {
                  const cancelarIda = cancelDetect.trecho === 'ida' || cancelDetect.trecho === 'ambos';
                  const cancelarVolta = cancelDetect.trecho === 'volta' || cancelDetect.trecho === 'ambos';

                  const Viagem = require('../models/Viagem');
                  const ViagemPassageiro = require('../models/ViagemPassageiro');
                  const hojeStr = new Date().toISOString().split('T')[0];

                  // Busca viagens de hoje onde esse passageiro estÃ¡
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
                        `âœ… Anotado, *${passageiro.nome}*! Tirei vocÃª da lista de *${trechoMsg}* de hoje. Se mudar de ideia, Ã© sÃ³ votar de novo na enquete! ðŸš`
                     );
                     return;
                  } else {
                     EvolutionService.sendMessage(remoteJid,
                        `ðŸ¤” *${passageiro.nome}*, nÃ£o encontrei nenhuma viagem sua cadastrada pra hoje. SerÃ¡ que a enquete ainda nÃ£o abriu?`
                     );
                     return;
                  }
               }

               // 4. InterceptaÃ§Ã£o de Troca de EndereÃ§o Ativo
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
                        return; // Impede que vÃ¡ pra fila genÃ©rica
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

            try {
               const updateInfo = typeof data === 'object' && !Array.isArray(data) ? data : data[0];
               if (updateInfo && updateInfo.update && updateInfo.update.pollUpdates) {
                  const voterJid = updateInfo.key.participant || updateInfo.key.remoteJid;
                  const groupJid = updateInfo.key.remoteJid;
                  console.log(`[Webhook] Recebeu Polling Update (Voto) de ${voterJid} no grupo ${groupJid}`);

                  // Extrai a opÃ§Ã£o selecionada do array de pollUpdates
                  const pollUpdates = updateInfo.update.pollUpdates;
                  let selectedOption = null;
                  for (const pu of pollUpdates) {
                     // Cada pollUpdate tem um .vote com as opÃ§Ãµes selecionadas
                     if (pu.vote && pu.vote.selectedOptions && pu.vote.selectedOptions.length > 0) {
                        selectedOption = pu.vote.selectedOptions[0]; // Pega a primeira (selectableCount=1)
                     }
                  }

                  if (!selectedOption) {
                     console.log(`[Webhook] Voto sem opÃ§Ã£o selecionada detectado. Ignorando...`);
                     return;
                  }

                  console.log(`[Webhook] OpÃ§Ã£o votada: "${selectedOption}" por ${voterJid}`);

                  // Acha o passageiro pelo telefone (pode estar no telefone_responsavel)
                  const passageiroVotante = await Passageiro.findOne({
                     where: { telefone_responsavel: voterJid, onboarding_step: 'CONCLUIDO' }
                  });

                  if (!passageiroVotante) {
                     console.log(`[Webhook] Passageiro ${voterJid} nÃ£o encontrado ou nÃ£o concluÃ­do. Voto ignorado.`);
                     return;
                  }

                  // Identifica o motorista pelo grupo
                  const grupoVoto = await GrupoMotorista.findOne({ where: { group_jid: groupJid } });
                  if (!grupoVoto) {
                     console.log(`[Webhook] Grupo ${groupJid} nÃ£o encontrado no sistema. Voto ignorado.`);
                     return;
                  }

                  const Viagem = require('../models/Viagem');
                  const ViagemPassageiro = require('../models/ViagemPassageiro');

                  // Descobre o turno pela hora atual (enquete manhÃ£ abre ~05h, tarde ~11h, noite ~17h)
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

                  // Mapeia a opÃ§Ã£o escolhida para status_ida e status_volta
                  const opcao = selectedOption.toLowerCase().trim();
                  let statusIda = 'ausente';
                  let statusVolta = 'ausente';

                  if (opcao.includes('ida e volta') || opcao.includes('ida & volta')) {
                     statusIda = 'confirmado';
                     statusVolta = 'confirmado';
                  } else if (opcao.includes('sÃ³ ida') || opcao.includes('so ida')) {
                     statusIda = 'confirmado';
                     statusVolta = 'ausente';
                  } else if (opcao.includes('sÃ³ volta') || opcao.includes('so volta')) {
                     statusIda = 'ausente';
                     statusVolta = 'confirmado';
                  } else if (opcao.includes('nÃ£o vou') || opcao.includes('nao vou')) {
                     statusIda = 'ausente';
                     statusVolta = 'ausente';
                  }

                  // Upsert: atualiza se jÃ¡ votou, cria se Ã© novo
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
         }

      } catch (error) {
         console.error('[Webhook] Erro critico no processamento do webhook:', error);
      }
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
                  await EvolutionService.sendMessage(groupJid, `🚙 *Olá pessoal! Sou o assistente virtual da Van do(a) ${motorista.nome}.*\n\nPara organizarmos as rotas diárias com inteligência artificial, cliquem no link abaixo para iniciar o cadastro no meu privado:\n\n👉 ${linkMagico}\n\nLá irei pedir Nome, Turno e Endereços rapidinho!`);
               } else {
                  console.log(`[Groups.Upsert] Grupo ${groupJid} já existe no sistema.`);
               }
            } else {
               // Não é motorista ativo — sai do grupo se não for conhecido
               const grupoConhecido = await GrupoMotorista.findOne({ where: { group_jid: groupJid } });
               if (!grupoConhecido) {
                  console.log(`[Groups.Upsert] Bot adicionado a grupo desconhecido por ${authorPhone}. Saindo!`);
                  await EvolutionService.leaveGroup(groupJid);
               }
            }
         }
      } catch (error) {
         console.error('[Groups.Upsert] ❌ Erro ao processar groups.upsert:', error.message || error);
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

         if (action !== 'add' || !author || !remoteJid) {
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
               await EvolutionService.sendMessage(remoteJid, `🚙 *Olá pessoal! Sou o assistente virtual da Van do(a) ${motorista.nome}.*\n\nPara organizarmos as rotas diárias com inteligência artificial, cliquem no link abaixo para iniciar o cadastro no meu privado:\n\n👉 ${linkMagico}\n\nLá irei pedir Nome, Turno e Endereços rapidinho!`);
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
         console.error('[Group Participants] ❌ Erro ao processar group-participants.update:', error.message || error);
      }
   }
}

module.exports = new WebhookController();
