const { GoogleGenAI } = require('@google/genai');

class ReceiptParserService {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Analisa um comprovante em formato de imagem/pdf via Gemini Multimodal.
   * @param {string} base64String A string Base64 do comprovante
   * @param {string} mimeType 'image/jpeg', 'image/png' ou 'application/pdf'
   */
  async validarComprovante(base64String, mimeType) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[ReceiptParserService] GEMINI_API_KEY ausente. Mockando retorno.');
      return { isReceipt: true, value: 0, fraudScore: 0, details: "Mock Data" };
    }

    const prompt = `
      Você é um auditor financeiro sênior especializado em anti-fraudes.
      A imagem/pdf em anexo deve ser um comprovante de transferência bancária (PIX, TED, DOC).
      
      Extraia os dados reais ou detecte se é uma fraude documental (recibo editado, texto torto, ausência de chave).
      
      Devolva EXATAMENTE E APENAS um JSON na seguinte estrutura sem blocos markdown:
      {
        "isReceipt": true/false, // se parece MESMO um comprovante legitimo
        "value": 150.00, // número flutuante numérico real (sem R$)
        "fraudScore": 0 a 100, // quão provavel é de ser falso (100 = falsissimo)
        "details": "Texto explicativo curto se algo estiver estranho"
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: base64String,
              mimeType: mimeType
            }
          }
        ],
      });

      const textOutput = response.text;
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);

    } catch (error) {
      console.error('[ReceiptParserService] Erro na análise I.A do comprovante:', error);
      return { isReceipt: false, value: 0, fraudScore: 100, details: "Erro na API do Gemini." };
    }
  }
}

module.exports = new ReceiptParserService();
