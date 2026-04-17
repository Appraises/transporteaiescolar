const axios = require('axios');

// Dicionário Sintático de Substituições em tempo-real (Humanização Lexical)
const SYNONYMS = {
    'Olá': ['Oi', 'Fala aí', 'Opa', 'Tudo bem?', 'E aí', 'Fala', 'Como vai?'],
    'Tudo bem?': ['Tudo joia?', 'Tudo certo?', 'Como você está?', 'Como vão as coisas?'],
    'atrasado': ['pendente', 'em haver', 'aberto', 'vencido'],
    'comprovante': ['recibo', 'foto do deposito', 'comprovante do pix'],
    'Valeu': ['Obrigado', 'Agradeço', 'Muito obrigado', 'Um abraço', 'Tamo junto'],
    'hoje': ['no dia de hoje', 'nesta data', 'agora mesmo', 'hoje mesmo']
};
const EMOJI_VARIATIONS = ['🚐', '🚗', '📚', '✌️', '👍', '👊', '✅', '✔'];
const ZERO_WIDTH_SPACE = '\u200B';

// Utilitários de atraso matemático
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

class EvolutionService {
  
  /**
   * Humaniza um texto modificando-o sutilmente para nunca gerar idêntico
   */
  humanizeMessage(text) {
      let result = text;
      // Trança Sinônimos Aleatoriamente
      for (const [original, alternatives] of Object.entries(SYNONYMS)) {
          if (result.includes(original) && Math.random() > 0.4) {
              const replacement = alternatives[randomInt(0, alternatives.length - 1)];
              result = result.replace(original, replacement);
          }
      }
      
      // Rotaciona os emojis para enganar o Hash 
      const mainEmoji = EMOJI_VARIATIONS[randomInt(0, EMOJI_VARIATIONS.length - 1)];
      result = result.replace(/[🚐🚗📚✌️👍👊✅✔]/, mainEmoji);

      // Injeta espaços invisiveis (Zero Width) no meio da string
      const chars = result.split('');
      const insertCount = randomInt(2, 4);
      for (let i = 0; i < insertCount; i++) {
          const pos = randomInt(5, chars.length - 5>0?chars.length - 5:chars.length);
          chars.splice(pos, 0, ZERO_WIDTH_SPACE);
      }
      return chars.join('');
  }

  /**
   * Emite presenças focadas ("digitando...")
   */
  async sendPresence(phoneId, presence = 'composing') {
      try {
          const instanceName = process.env.INSTANCE_ID || 'van_bot';
          const url = `${process.env.EVOLUTION_API_URL}/chat/sendPresence/${instanceName}`;
          await axios.post(url, {
              number: phoneId,
              presence: presence,
              delay: 800
          }, {
              headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
          });
          return true;
      } catch (error) {
          console.error('[EvolutionService] Falha ao enviar presença:', error.message);
          return false;
      }
  }

  /**
   * Disparo com delay matemático de digitação (Base da Referência)
   */
  async sendMessage(phoneId, text) {
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_TOKEN) {
      console.log(`[Evolution Mock] Mensagem simulada para ${phoneId}:\n"${text}"`);
      return true;
    }

    try {
      // 1. Torna a string única e imune a flags de spam da Meta
      const finalMessage = this.humanizeMessage(text);
      
      // 2. Aciona o "Digitando..." no celular do passageiro
      await this.sendPresence(phoneId, 'composing');

      // 3. Calcula os segundos de delay baseando-se no tamanho do texto
      const charCount = finalMessage.length;
      const charsPerSec = randomInt(6, 12);
      const rawTypingMs = (charCount / charsPerSec) * 1000;
      const typingMs = Math.max(2500, Math.min(rawTypingMs, 25000));
      
      console.log(`[Evolution] Simulando Digitação -> ${typingMs} ms (${charCount} chars)`);
      await delay(typingMs);

      // 4. Para de digitar (simula a respiração pro "enter")
      await this.sendPresence(phoneId, 'paused');
      await delay(randomInt(500, 1500));

      // 5. Manda a requisição final nativa
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`;
      await axios.post(url, {
        number: phoneId,
        textMessage: { text: finalMessage },
        options: { linkPreview: false }
      }, {
        headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
      });
      
      console.log(`[Evolution] Mensagem Despachada com Sucesso para ${phoneId}`);
      return true;
    } catch (error) {
      console.error('[EvolutionService] Erro brutal de disparo:', error.message);
      return false;
    }
  }
}

module.exports = new EvolutionService();
