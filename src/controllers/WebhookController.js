const WebhookQueueService = require('../services/WebhookQueueService');

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
      if (!data || !data.message) return;

      const remoteJid = data.key.remoteJid;
      const isFromMe = data.key.fromMe;

      // Se foi o próprio bot que enviou, geralmente ignoramos no fluxo de escuta,
      // a menos que queiramos rastrear confirmações precisas de entrega
      if (isFromMe) return;

      console.log(`[Webhook] Mensagem recebida de ${remoteJid}`);
      
      // Enfileira a mensagem.
      WebhookQueueService.enqueue(remoteJid, data);
    }
  }
}

module.exports = new WebhookController();
