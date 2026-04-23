const axios = require('axios');

// Utilitários de atraso matemático
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const WORD_CHARS = 'A-Za-z0-9_À-ÖØ-öø-ÿ';

// Lista revisada: mantém sinônimos ativos, mas só com trocas que preservam
// sentido, concordância e contexto nos templates atuais.
const ACTIVE_SYNONYMS = {
    'Olá': ['Oi', 'Opa'],
    'olá': ['oi', 'opa'],
    'Ola': ['Oi', 'Opa'],
    'ola': ['oi', 'opa'],
    'Tudo bem?': ['Tudo certo?', 'Tudo joia?'],
    'tudo bem?': ['tudo certo?', 'tudo joia?'],
    'Anotado!': ['Registrado!', 'Salvo!'],
    'Entendido!': ['Combinado!', 'Registrado!'],
    'Feito!': ['Pronto!', 'Tudo pronto!'],
    'Perfeito!': ['Ótimo!', 'Tudo certo!'],
    'Muito obrigado': ['Obrigado', 'Valeu'],
    'Obrigado': ['Valeu', 'Muito obrigado'],
    'Quando puder': ['Assim que puder', 'Quando conseguir'],
    'aqui mesmo': ['por aqui', 'neste chat'],
    'por aqui': ['aqui no chat', 'neste chat'],
    'comprovante do Pix': ['comprovante do PIX', 'comprovante de pagamento'],
    'comprovante do PIX': ['comprovante do Pix', 'comprovante de pagamento'],
    'pagamento registrado': ['pagamento confirmado', 'pagamento salvo'],
    'Pagamento registrado': ['Pagamento confirmado', 'Pagamento salvo'],
    'endereço completo': ['endereço com rua, número e bairro', 'endereço com todos os detalhes'],
    'endereco completo': ['endereço com rua, número e bairro', 'endereço com todos os detalhes'],
    'localização em tempo real': ['localização ao vivo', 'localização em tempo real'],
    'localizacao em tempo real': ['localização ao vivo', 'localização em tempo real'],
    'Turno livre': ['Sem rota nesse turno', 'Turno sem passageiros confirmados']
};

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function synonymRegex(original) {
    const startsWithWord = new RegExp(`^[${WORD_CHARS}]`).test(original);
    const endsWithWord = new RegExp(`[${WORD_CHARS}]$`).test(original);
    const prefix = startsWithWord ? `(?<![${WORD_CHARS}])` : '';
    const suffix = endsWithWord ? `(?![${WORD_CHARS}])` : '';
    return new RegExp(`${prefix}${escapeRegExp(original)}${suffix}`, 'u');
}

class EvolutionService {
  
  sanitizeOutgoingText(text) {
      if (!text) return '';

      let cleaned = '';
      for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          if (code >= 0xD800 && code <= 0xDBFF) {
              const next = text.charCodeAt(i + 1);
              if (next >= 0xDC00 && next <= 0xDFFF) {
                  cleaned += text[i] + text[i + 1];
                  i++;
              }
              continue;
          }
          if (code >= 0xDC00 && code <= 0xDFFF) continue;
          cleaned += text[i];
      }

      return cleaned.normalize('NFC');
  }

  /**
   * Humaniza um texto modificando-o sutilmente para nunca gerar idêntico
   */
  humanizeMessage(text) {
      let result = text;
      // Aplica sinônimos revisados aleatoriamente.
      for (const [original, alternatives] of Object.entries(ACTIVE_SYNONYMS)) {
          const pattern = synonymRegex(original);
          if (pattern.test(result) && Math.random() > 0.4) {
              const replacement = alternatives[randomInt(0, alternatives.length - 1)];
              result = result.replace(pattern, replacement);
          }
      }

      return this.sanitizeOutgoingText(result);
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

    let finalMessage = text;

    try {
      // 1. Torna a string única e imune a flags de spam da Meta
      finalMessage = this.humanizeMessage(text);
      
      // 2. Aciona o "Digitando..." no celular do passageiro
      await this.sendPresence(phoneId, 'composing');

      // 3. Calcula os segundos de delay baseando-se no tamanho do texto
      const charCount = finalMessage.length;
      const charsPerSec = randomInt(6, 12);
      const rawTypingMs = (charCount / charsPerSec) * 1000;
      const typingMs = Math.max(1200, Math.min(rawTypingMs, 5000)); // Reduzido para no máximo 5s para evitar perda de mensagens em restart
      
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
          console.error('[EvolutionService] Detalhes do erro da API:', JSON.stringify(error.response.data));
          console.error('[EvolutionService] Status:', error.response.status);
          console.error('[EvolutionService] Identificador (Number):', this.formatNumber(phoneId));
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
