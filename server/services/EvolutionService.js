const axios = require('axios');

// Dicionário Sintático de Substituições em tempo-real (Humanização Lexical e Anti-SPAM Meta)
const SYNONYMS = {
    // Saudações e Cumprimentos
    'Olá': ['Oi', 'Fala aí', 'Opa', 'Saudações', 'E aí', 'Fala'],
    'olá': ['oi', 'fala aí', 'opa', 'e aí'],
    'Tudo bem?': ['Tudo joia?', 'Tudo certo?', 'Tudo em paz?', 'Como vão as coisas?'],
    'tudo bem?': ['tudo joia?', 'tudo certo?', 'tudo na paz?'],
    'Valeu': ['Obrigado', 'Agradeço', 'Muito obrigado', 'Um abraço', 'Tamo junto', 'Valeu demais'],
    'valeu': ['obrigado', 'agradeço', 'um abraço', 'tamo junto'],
    
    // Status e Confirmações
    'Entendido': ['Anotado', 'Compreendido', 'Registrado', 'Copiado'],
    'entendido': ['anotado', 'compreendido', 'registrado', 'copiado'],
    'Anotado': ['Registrado', 'Salvo no sistema', 'Marcado'],
    'anotado': ['registrado', 'salvo', 'marcado'],
    'Feito': ['Prontinho', 'Concluído', 'Resolvido', 'Pronto'],
    'feito': ['prontinho', 'concluído', 'resolvido'],
    'Beleza': ['Maravilha', 'Perfeito', 'Ótimo', 'Show'],
    'beleza': ['maravilha', 'perfeito', 'ótimo', 'show'],
    'Tudo certo': ['Tudo OK', 'Tudo pronto', 'Maravilha'],
    'tudo certo': ['tudo ok', 'tudo pronto', 'maravilha'],

    // Termos Financeiros (Gênero garantido)
    'mensalidade': ['fatura', 'parcela', 'cobrança', 'assinatura'], // Femininos pra "a mensalidade" funcionar
    'Mensalidade': ['Fatura', 'Parcela', 'Cobrança', 'Assinatura'],
    'comprovante': ['recibo', 'documento', 'comprovante do pix'], // Masculinos pra "o comprovante" funcionar
    'Comprovante': ['Recibo', 'Documento'],
    'atrasado': ['pendente', 'vencido'], // "está atrasado" -> "está pendente"
    'Pix': ['pagamento', 'PIX', 'depósito'], // "o Pix" -> "o pagamento"
    'PIX': ['PAGAMENTO', 'DEPÓSITO'],
    
    // Termos de Logística e Lugares
    'garagem': ['base', 'residência', 'casa'], // Femininos pra "a garagem"
    'Garagem': ['Base', 'Residência', 'Casa'],
    'escola': ['instituição', 'faculdade'], // Femininos pra "na escola"
    'Escola': ['Instituição', 'Faculdade'],
    
    // Entidades e Pessoas
    'robô': ['assistente', 'sistema', 'bot', 'software'], // Masculinos pra "o robô"
    'Robô': ['Assistente', 'Sistema', 'Bot', 'Software'],
    'chefe': ['amigo', 'parceiro', 'mestre', 'campeão', 'comandante'], // Masculinos
    'Chefe': ['Amigo', 'Parceiro', 'Mestre', 'Campeão', 'Comandante'],
    'passageiro': ['aluno', 'cliente', 'estudante'],
    'passageiros': ['alunos', 'clientes', 'estudantes'],
    'Passageiros': ['Alunos', 'Clientes', 'Estudantes'],
    
    // Advérbios 
    'hoje': ['no dia de hoje', 'nesta data', 'agora mesmo', 'hoje mesmo'],
    'agora': ['já', 'nesse momento', 'imediatamente']
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
   * Limpa o número para o formato que a Evolution v2 prefere (sem sufixos)
   */
  formatNumber(phoneId) {
    if (phoneId && phoneId.endsWith('@g.us')) {
      return phoneId;
    }
    return phoneId ? phoneId.replace(/\D/g, '') : '';
  }

  /**
   * Emite presenças focadas ("digitando...")
   */
  async sendPresence(phoneId, presence = 'composing') {
      try {
          const instanceName = process.env.INSTANCE_ID || 'van_bot';
          const url = `${process.env.EVOLUTION_API_URL}/chat/sendPresence/${instanceName}`;
          await axios.post(url, {
              number: this.formatNumber(phoneId),
              presence: presence,
              delay: 800
          }, {
              headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
          });
          return true;
      } catch (error) {
          console.error('[EvolutionService] Falha ao enviar presença:', error.message);
          if (error.response) {
              console.error('[EvolutionService] Detalhes do erro de presença:', JSON.stringify(error.response.data));
          }
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
      const typingMs = Math.max(1500, Math.min(rawTypingMs, 15000)); // Reduzido para não demorar demais no onboarding
      
      console.log(`[Evolution] Simulando Digitação -> ${typingMs} ms (${charCount} chars)`);
      await delay(typingMs);

      // 4. Para de digitar (simula a respiração pro "enter")
      await this.sendPresence(phoneId, 'paused');
      await delay(500);

      // 5. Manda a requisição final nativa (Ajustado para Evolution v2)
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`;
      
      await axios.post(url, {
        number: this.formatNumber(phoneId),
        text: finalMessage,
        delay: 0,
        linkPreview: false
      }, {
        headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
      });
      
      console.log(`[Evolution] Mensagem Despachada com Sucesso para ${phoneId}`);
      return true;
    } catch (error) {
      console.error('[EvolutionService] Erro brutal de disparo:', error.message);
      if (error.response) {
          console.error('[EvolutionService] URL do erro:', url);
          console.error('[EvolutionService] Detalhes do erro da API:', JSON.stringify(error.response.data));
          console.error('[EvolutionService] Payload enviado:', JSON.stringify({
            number: this.formatNumber(phoneId),
            text: finalMessage
          }));
      }
      return false;
    }
  }

  /**
   * Remove o bot de um grupo através do id do Grupo
   */
  async leaveGroup(groupId) {
      if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_TOKEN) {
          console.log(`[Evolution Mock] Simulando saída do grupo: ${groupId}`);
          return true;
      }
      try {
          const instanceName = process.env.INSTANCE_ID || 'van_bot';
          // EvolutioV2 API endpoint comum para sair de grupos
          const url = `${process.env.EVOLUTION_API_URL}/group/leaveGroup/${instanceName}`;
          await axios.post(url, { groupJid: groupId }, {
              headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
          });
          console.log(`[Evolution] Saiu com sucesso do grupo não autorizado: ${groupId}`);
          return true;
      } catch (error) {
          console.error('[EvolutionService] Erro ao tentar sair de grupo:', error.message);
          return false;
      }
  }

  /**
   * Atualiza as configurações de comportamento da instância (v2)
   */
  async setInstanceSettings(settings) {
    try {
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/settings/set/${instanceName}`;
      await axios.post(url, settings, {
        headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
      });
      return true;
    } catch (error) {
      console.error('[EvolutionService] Erro ao definir configurações:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Atualiza a configuração do Webhook (v2)
   */
  async setWebhookConfig(config) {
    try {
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/webhook/set/${instanceName}`;
      await axios.post(url, { webhook: config }, {
        headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
      });
      return true;
    } catch (error) {
      console.error('[EvolutionService] Erro ao definir webhook:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Busca as configurações atuais da instância (v2)
   */
  async fetchSettings() {
    try {
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`;
      const response = await axios.get(url, {
        headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
      });
      const instance = response.data.find(i => i.name === instanceName);
      return instance ? instance.Setting : null;
    } catch (error) {
       console.error('[EvolutionService] Erro ao buscar configurações:', error.message);
       return null;
    }
  }

  /**
   * Busca a configuração do Webhook (v2)
   */
  async fetchWebhookConfig() {
    try {
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/webhook/find/${instanceName}`;
      const response = await axios.get(url, {
        headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
      });
      // Na v2, isso pode vir como uma lista de webhooks
      if (Array.isArray(response.data)) {
        return response.data[0] || null;
      }
      return response.data;
    } catch (error) {
       console.error('[EvolutionService] Erro ao buscar webhook:', error.message);
       return null;
    }
  }

  /**
   * Busca o Base64 de um arquivo de mídia baseado no ID da mensagem (Padrão CatÓleo)
   */
  async getMediaBase64(messageId) {
    try {
      const instanceName = process.env.INSTANCE_ID || 'van_bot';
      const url = `${process.env.EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`;
      
      const response = await axios.post(url, {
        message: { key: { id: messageId } },
        convertToMp4: false
      }, {
        headers: { 'apikey': process.env.EVOLUTION_API_TOKEN },
        timeout: 30000 // 30s de timeout para downloads lentos
      });

      return response.data?.base64 || null;
    } catch (error) {
      console.error('[EvolutionService] Falha ao baixar mídia da API:', error.message);
      return null;
    }
  }
}

module.exports = new EvolutionService();
