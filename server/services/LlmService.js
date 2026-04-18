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
  /**
   * Analisa um texto e tenta extrair uma despesa/gasto do motorista.
   */
  async parseExpense(rawText) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[LlmService] GEMINI_API_KEY ausente. Usando mock para parseExpense.');
      // Lógica de fallback super simples para testes sem chave
      const lower = rawText.toLowerCase();
      if (lower.includes('gastei') || lower.includes('paguei') || lower.includes('custo') || lower.includes('gasolina') || lower.includes('manutenção') || lower.includes('pedágio')) {
         const match = rawText.match(/\d+(?:,\d+)?/);
         const valor = match ? parseFloat(match[0].replace(',', '.')) : 0;
         if (valor > 0) {
            let cat = 'outros';
            if(lower.includes('gasolina') || lower.includes('combustível') || lower.includes('álcool') || lower.includes('diesel')) cat = 'combustível';
            if(lower.includes('mecânico') || lower.includes('óleo') || lower.includes('manutenção') || lower.includes('peça') || lower.includes('pneu')) cat = 'manutenção';
            if(lower.includes('pedágio')) cat = 'pedágio';
            return { isExpense: true, categoria: cat, valor: valor, descricao: rawText };
         }
      }
      return { isExpense: false };
    }

    const prompt = `
      Você é um assistente financeiro de uma van escolar. O motorista enviou a seguinte mensagem:
      "${rawText}"

      Verifique se esta mensagem é o motorista informando um gasto/despesa com a van (ex: gasolina, pedágio, mecânico, lavagem, etc).
      Se for, extraia as informações e retorne EXATAMENTE APENAS um JSON válido (sem markdown), com esta estrutura:
      {
        "isExpense": true,
        "categoria": "gasolina | manutenção | pedágio | seguro | lavagem | outros",
        "valor": <numero_float_sem_moeda>,
        "descricao": "<resumo_curto_do_gasto>"
      }

      Se NÃO for uma mensagem relatando um gasto (ex: for uma pergunta, bom dia, ou outra coisa), retorne:
      {
        "isExpense": false
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const textOutput = response.text;
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[LlmService] Falha ao extrair despesa:', error);
      return { isExpense: false };
    }
  }
  /**
   * Analisa um texto e tenta extrair uma intenção de troca de endereço ativo do aluno.
   */
  async parseAddressSwitch(rawText, enderecosDisponiveis) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[LlmService] GEMINI_API_KEY ausente. Usando mock para parseAddressSwitch.');
      const lower = rawText.toLowerCase();
      if (lower.includes('trocar') || lower.includes('mudar') || lower.includes('endereço')) {
          let trecho = 'ambos';
          if (lower.includes('ida') && !lower.includes('volta')) trecho = 'ida';
          if (lower.includes('volta') && !lower.includes('ida')) trecho = 'volta';
          
          // Tenta achar um apelido que dê match
          const apelidos = enderecosDisponiveis.map(e => e.apelido.toLowerCase());
          const apelidoEncontrado = apelidos.find(a => lower.includes(a));

          if (apelidoEncontrado) {
              const original = enderecosDisponiveis.find(e => e.apelido.toLowerCase() === apelidoEncontrado);
              return { isSwitch: true, trecho: trecho, apelido: original.apelido };
          }
      }
      return { isSwitch: false };
    }

    const listaEnderecos = enderecosDisponiveis.map(e => e.apelido).join(', ');

    const prompt = `
      Você é um assistente de uma van escolar. O aluno/responsável enviou a seguinte mensagem:
      "${rawText}"

      Verifique se esta mensagem é um pedido para trocar o endereço ativo do dia.
      Os endereços que o aluno tem cadastrados (apelidos) são: [${listaEnderecos}].

      Se for um pedido de troca, extraia qual o trecho (ida, volta ou ambos) e o apelido do endereço desejado (deve ser um dos cadastrados ou muito parecido).
      Retorne EXATAMENTE APENAS um JSON válido (sem markdown), com esta estrutura:
      {
        "isSwitch": true,
        "trecho": "ida | volta | ambos",
        "apelido": "<apelido_do_endereco_escolhido>"
      }

      Se NÃO for um pedido de troca de endereço, retorne:
      {
        "isSwitch": false
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const textOutput = response.text;
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[LlmService] Falha ao extrair troca de endereço:', error);
      return { isSwitch: false };
    }
  }
}

module.exports = new LlmService();
