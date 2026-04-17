const axios = require('axios');
const MessageVariation = require('../utils/MessageVariation');

class PollService {
  /**
   * Envia a enquete para o Grupo do WhatsApp
   * @param {string} turno Manhã, Tarde ou Noite
   */
  async dispararEnquete(turno) {
    const groupId = process.env.WHATSAPP_GROUP_ID; // Ex: 120363@g.us
    
    if (!groupId || !process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_TOKEN) {
      console.log(`[Poll Mock] Disparando enquete mockada pro Turno: ${turno}`);
      return true;
    }

    try {
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/message/sendPoll/${instanceName}`;
      
      const payload = {
        number: groupId,
        options: {
          delay: 1200,
          presence: 'composing'
        },
        pollMessage: {
          name: MessageVariation.logistica.pollHeader(turno),
          options: [
            "Vou (Ida e Volta)",
            "Só Ida",
            "Só Volta",
            "Não Vou"
          ],
          selectableCount: 1
        }
      };

      await axios.post(url, payload, {
        headers: {
          'apikey': process.env.EVOLUTION_API_TOKEN
        }
      });
      console.log(`[PollService] Enquete do turno ${turno} disparada com sucesso!`);
      return true;
    } catch (error) {
      console.error('[PollService] Erro ao disparar enquete:', error.message);
      return false;
    }
  }
}

module.exports = new PollService();
