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
const CACHE_LIMIT = 500; // Limite de IDs para não crescer infinitamente

class WebhookController {
  
  async handleEvolutionAPI(req, res) {
    try {
      const body = req.body;
      if (!body) return res.status(400).send('Payload vazio');

      const event = body.event;
      const instance = body.instance;

      // Responde logo ao webhook (200 OK) para evitar re-envio por timeout
      res.status(200).send({ status: 'received' });

      // Verificação de duplicidade por ID de mensagem (se disponível no payload)
      const msgId = body.data?.key?.id || (Array.isArray(body.data) && body.data[0]?.key?.id);
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
      const validEvents = ['messages.upsert', 'MESSAGES_UPSERT', 'messages.create', 'MESSAGES_CREATE']; // Adicionei variações de CREATE por precaução
      if (!validEvents.includes(event)) {
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

      if (messages.length === 0) {
          console.log('[Webhook] ⚠️ Nenhuma mensagem encontrada no campo data.');
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
      
      // 1. Tratativa de Arquivos e Fotos (Para Comprovantes) e Áudios (Para Whisper STT)
      const messageKeys = data.message ? Object.keys(data.message) : [];
      const msgType = messageKeys.find(key => key === 'audioMessage' || key === 'imageMessage' || key === 'documentMessage' || key === 'videoMessage') || messageKeys[0];
      
      // Tratamento Específico para Voice Notes (Áudios do Motorista)
      if (msgType === 'audioMessage') {
          let base64ToUse = data.base64;
          
          if (!base64ToUse) {
             console.log(`[Audio] 🎙️ Base64 ausente, baixando da API para a mensagem ${data.key.id}...`);
             base64ToUse = await EvolutionService.getMediaBase64(data.key.id);
          }

          if (base64ToUse) {
              console.log(`[Audio] Áudio pronto para ${remoteJid}, iniciando conversão e Whisper STT Local...`);
              try {
                  const AudioTranscriptionService = require('../services/AudioTranscriptionService');
                  const textoTranscrito = await AudioTranscriptionService.transcribeAudioBase64(base64ToUse);
                  
                  if (!textoTranscrito || textoTranscrito.trim() === '') {
                      console.log(`[Audio] Áudio ininteligível ou vazio ignorado.`);
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
             console.warn(`[Audio] Áudio detectado de ${remoteJid}, mas sem conteúdo Base64. Verifique se o envio de Base64 está ativado nas configurações do Webhook da sua instância Evolution.`);
             return;
          }
      } 
      // Tratamento Antigo de Mídias/Imagens para Recibos
      else if (msgType === 'imageMessage' || msgType === 'documentMessage') {
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

      // 1.5 Tratamento de Localização em Tempo Real (GPS Tracking)
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
          return; // Localização não vai pro funil de texto
      }
 
      // 1.6 FUNIL DE VENDAS PARA NOVOS MOTORISTAS (DESCONHECIDOS)
      const normalizedJid = normalizePhone(remoteJid);
      
      if (!isGroup) {
         const m = await Motorista.findOne({ where: { telefone: normalizedJid }});
         const p = await Passageiro.findOne({ where: { telefone_responsavel: normalizedJid } });

         // Se não conhecemos esse número de lugar nenhum, ou se ele já é um LEAD
         if (!p && (!m || m.status === 'lead')) {
            // A. NOVO LEAD (Primeiro contato)
            if (!m) {
               console.log(`[Vendas] Novo prospect: ${remoteJid}. Enviando Pitch.`);
               await Motorista.create({ telefone: remoteJid, status: 'lead', venda_etapa: 'APRESENTACAO' });
               await EvolutionService.sendMessage(remoteJid, SalesService.getPitch());
               return;
            }

            // B. ETAPA: APRESENTACAO (Aguardando confirmacão de interesse)
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
                  const hasBase64 = data.base64;
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
                        await EvolutionService.sendMessage(remoteJid, `⚠️ hmmm, não consegui validar esse comprovante. Verifique o valor (R$ ${SalesService.MONTHLY_VALUE}) e tente mandar a imagem novamente.`);
                        return;
                     }
                  }
               }
            }

            // D. ETAPA: AGUARDANDO_NOME (Finalização do cadastro)
            if (m.venda_etapa === 'AGUARDANDO_NOME' && textMessage.trim().length > 3) {
               m.nome = textMessage.trim();
               m.status = 'ativo';
               m.venda_etapa = 'CONCLUIDO';
               m.boas_vindas_enviada = true;
               await m.save();

               // Envia the Oficial Tutorial
               await EvolutionService.sendMessage(remoteJid, LlmService.getDriverOnboardingMessage(m.nome));
               console.log(`[Vendas] CONVERSÃO COMPLETA! Novo motorista: ${m.nome}`);
               return;
            }

            // Se for conversa genérica de lead, ignora ou manda pitch de novo se for muito tempo
            return; 
         }
      }

      if (!isGroup) {
          const m = await Motorista.findOne({ where: { telefone: normalizedJid, status: 'ativo' }});
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

             // A0b. Comando Escola (Destino da Rota - para aviso no grupo)
             if (textMessage.toLowerCase().startsWith('escola ')) {
                 const GeocodeService = require('../services/GeocodeService');
                 const textoEscola = textMessage.substring(7).trim();
                 
                 EvolutionService.sendMessage(remoteJid, `🏫 Processando localização da escola/faculdade...`);
                 
                 const coords = await GeocodeService.getCoordinates(textoEscola);
                 if (coords) {
                     m.escola_nome = textoEscola.split(',')[0].trim() || textoEscola;
                     m.escola_latitude = coords.lat;
                     m.escola_longitude = coords.lng;
                     await m.save();
                     EvolutionService.sendMessage(remoteJid, `✅ Escola/Faculdade registrada: *${m.escola_nome}*!\nQuando a van estiver chegando, vou avisar a galera no grupo automaticamente.`);
                 } else {
                     EvolutionService.sendMessage(remoteJid, `⚠️ Não achei esse endereço. Tenta algo mais completo. Exemplo:\nescola UFS, São Cristóvão - SE`);
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

             // A2. Comando Raio (Configurar raio de notificação GPS)
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
                     EvolutionService.sendMessage(remoteJid, `⚠️ Não encontrei nenhuma rota gerada pra hoje. As enquetes já fecharam?`);
                 }
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

             // D. Cadastro de Alunos por Voz/Texto Natural (via LLM)
             const lowerText = textMessage.toLowerCase();
             if (lowerText.includes('cadastra') || lowerText.includes('novo aluno') || lowerText.includes('adiciona passageiro') || lowerText.includes('matrícula')) {
                console.log(`[Onboarding] Detectada intenção de cadastro por voz de motorista ${m.id}`);
                
                const dadosAluno = await LlmService.extractStudentData(textMessage);
                
                if (dadosAluno && dadosAluno.nome && dadosAluno.nome !== 'null') {
                   const Passageiro = require('../models/Passageiro');
                   const novoPassageiro = await Passageiro.create({
                      motorista_id: m.id,
                      nome: dadosAluno.nome,
                      turno: dadosAluno.turno || 'manha',
                      mensalidade: dadosAluno.mensalidade || 0,
                      bairro: dadosAluno.bairro,
                      telefone_responsavel: dadosAluno.telefone_responsavel || '5500000000000', // Mock se não informado
                      onboarding_step: 'CONCLUIDO' // O motorista mesmo cadastrou, então já nasce pronto
                   });

                   await EvolutionService.sendMessage(remoteJid, 
                      `✅ *Aluno Cadastrado com Sucesso!*\n\n` +
                      `👤 *Nome:* ${novoPassageiro.nome}\n` +
                      `🕐 *Turno:* ${novoPassageiro.turno.toUpperCase()}\n` +
                      `💰 *Mensalidade:* R$ ${novoPassageiro.mensalidade.toFixed(2)}\n` +
                      `📍 *Bairro:* ${novoPassageiro.bairro || 'Não informado'}\n\n` +
                      `O aluno já aparece na sua lista de passageiros no painel! 🚐💨`
                   );
                   return;
                } else {
                   await EvolutionService.sendMessage(remoteJid, `⚠️ hmmm, não consegui entender o nome do aluno na sua mensagem. Pode repetir? Ex: *"Cadastra o aluno João Silva no turno da manhã"*`);
                   return;
                }
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
      let passageiro = await Passageiro.findOne({ where: { telefone_responsavel: normalizedJid } });

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
              telefone_responsavel: normalizedJid,
              onboarding_step: 'AGUARDANDO_NOME',
              motorista_id: motoristaAlvo.id
          });
          console.log(`[Onboarding] Passageiro ${normalizedJid} vinculado ao motorista ${motoristaAlvo.nome} (ID ${motoristaAlvo.id}) via Link Mágico.`);
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
              passageiro.onboarding_step = 'AGUARDANDO_MENSALIDADE';
              await passageiro.save();
              
              const msgConfirm = MessageVariation.enderecos.confirmacao(countCadastrados);
              EvolutionService.sendMessage(remoteJid, msgConfirm);

              // Pede a mensalidade com piadinha
              setTimeout(() => {
                EvolutionService.sendMessage(remoteJid, `*4. Última pergunta!* 💰\nQual o valor da sua mensalidade da van?\n\n(Ex: 250, 180.50)\n\n⚠️ _Esse valor será verificado pelo motorista, então nem tenta colocar R$ 1,99 que não cola não, hein! 😂🚐_`);
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

              EvolutionService.sendMessage(remoteJid, `✅ *Cadastro finalizado com sucesso!* 🎉\n\n📋 *Resumo:*\n👤 ${passageiro.nome}\n🕐 Turno: ${passageiro.turno}\n💰 Mensalidade: R$ ${valor.toFixed(2)}\n\nAgora é só ficar de olho na enquete diária no grupo! 🚐`);

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
                      if (counts >= meta) textMeta = `(LOTAÇÃO COMPLETA! 🎉 A van encheu!)`;
                      else textMeta = `(Faltam ${meta - counts} alunos para fechar a lista desse turno!)`;
                  }
                  
                  const notifyText = `🔔 *Novo Aluno a Bordo!*\n\nO(A) responsável/aluno *${passageiro.nome}* concluiu o auto-cadastro para o turno *${passageiro.turno}*.\nMensalidade informada: *R$ ${valor.toFixed(2)}*\n\n📊 *Resumo do Turno:* Você tem ${counts} confirmados.\n${textMeta}`;
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
                `✅ Anotado, *${passageiro.nome}*! Tirei você da lista de *${trechoMsg}* de hoje. Se mudar de ideia, é só votar de novo na enquete! 🚐`
              );
              return;
            } else {
              EvolutionService.sendMessage(remoteJid, 
                `🤔 *${passageiro.nome}*, não encontrei nenhuma viagem sua cadastrada pra hoje. Será que a enquete ainda não abriu?`
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

           // Extrai a opção selecionada do array de pollUpdates
           const pollUpdates = updateInfo.update.pollUpdates;
           let selectedOption = null;
           for (const pu of pollUpdates) {
              // Cada pollUpdate tem um .vote com as opções selecionadas
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
  } catch (error) {
    console.error('[Webhook] ❌ Erro crítico no processamento do webhook:', error);
  }
}
}

module.exports = new WebhookController();
