/**
 * WebhookQueueService
 * Servico responsavel por enfileirar mensagens que chegam via webhook
 * e disparar o processamento apos um pequeno debounce.
 */
const LlmService = require('./LlmService');
const EvolutionService = require('./EvolutionService');
const Motorista = require('../models/Motorista');
const { normalizePhone } = require('../utils/phoneHelper');

class WebhookQueueService {
  constructor() {
    this.queues = new Map();
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
    chatQueue.messages.push(messageData);

    if (chatQueue.timer) {
      clearTimeout(chatQueue.timer);
    }

    chatQueue.timer = setTimeout(() => {
      this.processQueue(remoteJid);
    }, this.DEBOUNCE_TIME_MS);
  }

  async processQueue(remoteJid) {
    const chatQueue = this.queues.get(remoteJid);
    if (!chatQueue || chatQueue.messages.length === 0) return;

    const messagesToProcess = [...chatQueue.messages];
    this.queues.delete(remoteJid);

    console.log(`[QueueService] Processando ${messagesToProcess.length} mensagens acumuladas para ${remoteJid}`);

    try {
      const textBuffer = messagesToProcess
        .map(msg => msg.message?.conversation || msg.message?.extendedTextMessage?.text || '')
        .filter(text => text.trim() !== '')
        .join('. ');

      if (textBuffer.length === 0) {
        return;
      }

      console.log(`[QueueService] Texto consolidado: "${textBuffer}"`);
      const intention = await LlmService.parseIntentions(textBuffer);
      console.log(`[QueueService] Intencao detectada para ${remoteJid}:`, intention);

      const normalizedJid = normalizePhone(remoteJid);
      const motorista = await Motorista.findOne({ where: { telefone: normalizedJid, status: 'ativo' } });

      if (motorista) {
        if (!motorista.boas_vindas_enviada) {
          const onboardingMessage = LlmService.getDriverOnboardingMessage(motorista.nome);
          await EvolutionService.sendMessage(remoteJid, onboardingMessage);
          motorista.boas_vindas_enviada = true;
          await motorista.save();
          return;
        }

        if (intention.action === 'GENERAL_CHAT') {
          const tutorialMessage = LlmService.getDriverTutorialMessage(motorista.nome);
          await EvolutionService.sendMessage(remoteJid, tutorialMessage);
          return;
        }
      }

      if (intention.action === 'REGISTER_STUDENT') {
        // ControllerFinanceiro.etc
      }
    } catch (error) {
      console.error(`[QueueService] Erro ao processar mensagens para ${remoteJid}:`, error);
    }
  }
}

module.exports = new WebhookQueueService();
