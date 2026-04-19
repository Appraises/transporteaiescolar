const axios = require('axios');
const MessageVariation = require('../utils/MessageVariation');

class PollService {
  /**
   * Envia a enquete para o Grupo do WhatsApp
   * @param {string} turno Manhã, Tarde ou Noite
   * @param {string} targetJid ID do grupo alvo
   */
  async dispararEnquete(turno, targetJid = null) {
    const groupId = targetJid || process.env.WHATSAPP_GROUP_ID; // Fallback para mock
    
    if (!groupId || !process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_TOKEN) {
      console.log(`[Poll] Disparando enquete mockada pro Turno: ${turno}`);
      return true;
    }

    try {
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/message/sendPoll/${instanceName}`;
      
      const payload = {
        number: groupId,
        name: MessageVariation.logistica.pollHeader(turno),
        selectableCount: 1,
        values: [
          "Vou (Ida e Volta)",
          "Só Ida",
          "Só Volta",
          "Não Vou"
        ],
        delay: 1200
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
