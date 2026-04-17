const { GoogleGenAI } = require('@google/genai');

class LlmService {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Transforma textos puros (brutos) em uma Intenção estruturada em JSON
   * @param {string} rawText Bloco de texto conversacional do cliente
   */
  async parseIntentions(rawText) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[LlmService] GEMINI_API_KEY ausente. Usando intent fallback MOCK.');
      return { action: 'UNKNOWN', confidence: 0 };
    }

    const prompt = `
      Você é o cérebro de inteligência do "Gestor de Transporte Escolar" (uma van escolar).
      Seu objetivo é ler a mensagem enviada pelo usuário via WhatsApp e classificar a INTENÇÃO primária.

      Mensagem do usuário: "${rawText}"

      Regra de Output: Retorne APENAS um objeto JSON válido (sem blocos de formatação markdown), com a seguinte estrutura:
      {
        "action": "tipo_da_acao",
        "confidence": 0 a 100,
        "details": {}
      }
      
      Lista de Actions permitidas:
      - REGISTER_STUDENT: Quando o aluno/pai quer cadastrar endereço, turno e nome.
      - ABSENCE_NOTICE: Quando avisa que o aluno não vai para a van hoje.
      - DRIVER_CHECKPOINT: Quando o motorista (reconhecido via contexto) avisa que "pegou fulano" ou "já estou indo para a escola".
      - FINANCE_APPROVE: Quando o MOTORISTA responde positivamente (ex: "ok", "sim", "pode baixar", "aprovado") confirmando a validade de um comprovante suspeito enviado pela IA.
      - FINANCE_REJECT: Quando o MOTORISTA responde negativamente (ex: "não", "fake", "falso", "cancela") recusando um comprovante suspeito.
      - GENERAL_CHAT: Conversa normal ou dúvida não catalogada.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const textOutput = response.text;
      
      // Limpar blocos de código se a IA retornar com formatação markdown
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanJsonStr);
      
    } catch (error) {
      console.error('[LlmService] Falha ao derivar intenção:', error);
      return { action: 'API_ERROR', confidence: 0 };
    }
  }
}

module.exports = new LlmService();
