/**
 * WebhookQueueService
 * Serviço responsável por enfileirar mensagens que chegam via Webhook
 * e disparar o processamento após um buffer/debounce.
 * Isso evita race conditions e garante que mensagens picadas enviadas rapidamente
 * sejam agrupadas antes de acionar a LLM e regras de negócio.
 */
const LlmService = require('./LlmService');
const EvolutionService = require('./EvolutionService');
const Motorista = require('../models/Motorista');
const { normalizePhone } = require('../utils/phoneHelper');

class WebhookQueueService {
  constructor() {
    this.queues = new Map();
    // Tempo de espera (buffer) antes de processar as mensagens de determinado chat
    this.DEBOUNCE_TIME_MS = 3000; 
  }

  enqueue(remoteJid, messageData) {
    if (!this.queues.has(remoteJid)) {
      this.queues.set(remoteJid, {
        messages: [],
        timer: null
      });
    }

    const chatQueue = this.queues.get(remoteJid);
    
    // Adiciona a mensagem atual no final da fila desse chat
    chatQueue.messages.push(messageData);

    // Se já tinha um timer rodando para esse chat, cancela-o
    if (chatQueue.timer) {
      clearTimeout(chatQueue.timer);
    }

    // Inicia um novo timer. Se não chegar msg nova em 3 segs, processa tudo.
    chatQueue.timer = setTimeout(() => {
      this.processQueue(remoteJid);
    }, this.DEBOUNCE_TIME_MS);
  }

  async processQueue(remoteJid) {
    const chatQueue = this.queues.get(remoteJid);
    if (!chatQueue || chatQueue.messages.length === 0) return;

    // Remove as mensagens da fila e limpa o timer
    const messagesToProcess = [...chatQueue.messages];
    this.queues.delete(remoteJid);

    console.log(`[QueueService] Processando ${messagesToProcess.length} mensagens acumuladas para ${remoteJid}`);

    try {
      // Extraindo apenas os textos puros das mensagens (supondo estrutura básica textual por ora)
      const textBuffer = messagesToProcess
        .map(msg => msg.message?.conversation || msg.message?.extendedTextMessage?.text || '')
        .filter(text => text.trim() !== '')
        .join('. ');

      if (textBuffer.length > 0) {
        console.log(`[QueueService] Texto consolidado: "${textBuffer}"`);
        // Aqui acionamos o Cérebro IA Ativamente:
        const intention = await LlmService.parseIntentions(textBuffer);
        
        console.log(`[QueueService] 🧠 Intenção detectada para ${remoteJid}:`, intention);
        
        const normalizedJid = normalizePhone(remoteJid);

        // 1. Verificar se é um Motorista e se precisa de Boas-vindas ou se é General Chat
        const motorista = await Motorista.findOne({ where: { telefone: normalizedJid, status: 'ativo' } });
        
        if (motorista) {
           if (!motorista.boas_vindas_enviada || intention.action === 'GENERAL_CHAT') {
              const guideMessage = LlmService.getDriverOnboardingMessage(motorista.nome);
              await EvolutionService.sendMessage(remoteJid, guideMessage);
              
              if (!motorista.boas_vindas_enviada) {
                 motorista.boas_vindas_enviada = true;
                 await motorista.save();
              }
              return; // Bloqueia outros processamentos para não poluir
           }
        }

        // 2. Roteamento de comandos específicos (Futuro)
        if (intention.action === 'REGISTER_STUDENT') {
           // ControllerFinanceiro.etc
        }
      }

    } catch (error) {
      console.error(`[QueueService] Erro ao processar mensagens para ${remoteJid}:`, error);
    }
  }
}

module.exports = new WebhookQueueService();
