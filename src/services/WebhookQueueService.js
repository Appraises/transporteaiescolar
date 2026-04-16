/**
 * WebhookQueueService
 * Serviço responsável por enfileirar mensagens que chegam via Webhook
 * e disparar o processamento após um buffer/debounce.
 * Isso evita race conditions e garante que mensagens picadas enviadas rapidamente
 * sejam agrupadas antes de acionar a LLM e regras de negócio.
 */

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

    // Aqui no futuro chamaremos o LlmService passando esse "bolo" de contexto
    // e o roteador de intenções (baixa do motorista, cadastro, cancelamento do dia, etc)
    try {
      // Dummy process logic for now
      messagesToProcess.forEach(msg => {
         console.log(`- Conteúdo a processar: ${JSON.stringify(msg.message || {})}`);
      });
    } catch (error) {
      console.error(`[QueueService] Erro ao processar mensagens para ${remoteJid}:`, error);
    }
  }
}

module.exports = new WebhookQueueService();
