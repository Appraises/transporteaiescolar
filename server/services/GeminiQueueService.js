/**
 * GeminiQueueService
 * Gerencia uma fila sequencial para chamadas da API do Gemini.
 * Garante que não ultrapassemos o limite de 15 RPM (Requests Per Minute) do plano gratuito,
 * processando uma tarefa por vez com um intervalo de segurança.
 */
class GeminiQueueService {
    constructor() {
      this.queue = [];
      this.isProcessing = false;
      this.DELAY_BETWEEN_REQUESTS_MS = 4000; // 4 segundos = exatamente 15 RPM se os processos forem instantâneos
    }
  
    /**
     * Adiciona uma tarefa (função que retorna uma Promise) à fila.
     * @param {Function} taskFn Função assíncrona que executa a chamada à API
     * @returns {Promise<any>} Resultado da execução da tarefa
     */
    enqueue(taskFn) {
      return new Promise((resolve, reject) => {
        this.queue.push({ taskFn, resolve, reject });
        this.process();
      });
    }
  
    async process() {
      if (this.isProcessing || this.queue.length === 0) return;
  
      this.isProcessing = true;
      const { taskFn, resolve, reject } = this.queue.shift();
  
      try {
        const result = await taskFn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        // Aguarda o tempo de segurança antes de liberar a próxima tarefa
        setTimeout(() => {
          this.isProcessing = false;
          this.process();
        }, this.DELAY_BETWEEN_REQUESTS_MS);
      }
    }
  }
  
  module.exports = new GeminiQueueService();
