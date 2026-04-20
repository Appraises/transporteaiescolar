const { GoogleGenAI } = require('@google/genai');
const GeminiQueueService = require('./GeminiQueueService');

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
      const response = await GeminiQueueService.enqueue(() => 
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );

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
      const response = await GeminiQueueService.enqueue(() => 
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );

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
      const response = await GeminiQueueService.enqueue(() => 
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );

      const textOutput = response.text;
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[LlmService] Falha ao extrair troca de endereço:', error);
      return { isSwitch: false };
    }
  }

  /**
   * Analisa pausas operacionais (Férias e Feriados prolongados)
   */
  async parseOperationPause(rawText, dataHojeStr) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[LlmService] GEMINI_API_KEY ausente. Usando mock para parseOperationPause.');
      return { isPauseCommand: false };
    }

    const prompt = `
      Você é o assistente de uma van escolar. O motorista enviou a seguinte mensagem hoje (${dataHojeStr}):
      "${rawText}"

      Verifique se o motorista está comunicando a suspensão dos serviços (ex: informando que é feriado, ponto facultativo, semana do saco cheio ou que entrará de férias) OU se está comunicando o retorno aos trabalhos.
      Feriados podem ser apenas 1 dia ou emendar vários dias.

      Retorne EXATAMENTE APENAS um JSON válido (sem markdown), com esta estrutura:
      {
        "isPauseCommand": true ou false,
        "type": "FERIADO" | "FERIAS_INICIO" | "FERIAS_FIM",
        "startDate": "YYYY-MM-DD" ou null,
        "endDate": "YYYY-MM-DD" ou null
      }

      Regras:
      - Para FERIADO: se for só amanhã, startDate e endDate serão a data de amanhã.
      - Para FERIAS_INICIO: startDate é quando começa, endDate pode ser null se ele não avisou quando volta.
      - Para FERIAS_FIM (retorno): retornará isPauseCommand true com type FERIAS_FIM.
      Se NÃO for um comando de recesso/férias, retorne {"isPauseCommand": false}.
    `;

    try {
      const response = await GeminiQueueService.enqueue(() => 
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );

      const textOutput = response.text;
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[LlmService] Falha ao extrair pausa operacional:', error);
      return { isPauseCommand: false };
    }
  }

  /**
   * Analisa se o passageiro quer cancelar a ida, a volta, ou ambos trechos do dia.
   */
  async parseRideCancellation(rawText) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[LlmService] GEMINI_API_KEY ausente. Usando mock para parseRideCancellation.');
      const lower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes('nao volto') || lower.includes('nao vou voltar') || lower.includes('cancela volta') || lower.includes('sem volta')) {
        return { isCancellation: true, trecho: 'volta' };
      }
      if (lower.includes('nao vou ir') || lower.includes('cancela ida') || lower.includes('sem ida')) {
        return { isCancellation: true, trecho: 'ida' };
      }
      if (lower.includes('nao vou hoje') || lower.includes('nao vou mais') || lower.includes('cancela tudo') || lower.includes('nao preciso')) {
        return { isCancellation: true, trecho: 'ambos' };
      }
      return { isCancellation: false };
    }

    const prompt = `
      Você é um assistente de uma van escolar. O aluno/responsável enviou a seguinte mensagem:
      "${rawText}"

      Verifique se esta mensagem indica que a pessoa quer CANCELAR uma viagem de van de hoje.
      Exemplos de cancelamento:
      - "não volto hoje" → cancela a VOLTA
      - "consegui carona pra voltar" → cancela a VOLTA
      - "não preciso da van na ida" → cancela a IDA
      - "meu pai vai me levar amanhã" → NÃO é cancelamento (fala de amanhã, não de hoje)
      - "não vou pra aula hoje" → cancela IDA e VOLTA (ambos)
      - "tô doente, não vou" → cancela IDA e VOLTA (ambos)
      - "bom dia" → NÃO é cancelamento

      Retorne EXATAMENTE APENAS um JSON válido (sem markdown), com esta estrutura:
      {
        "isCancellation": true ou false,
        "trecho": "ida" | "volta" | "ambos"
      }

      Se NÃO for um pedido de cancelamento, retorne:
      {
        "isCancellation": false
      }
    `;

    try {
      const response = await GeminiQueueService.enqueue(() => 
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );

      const textOutput = response.text;
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[LlmService] Falha ao extrair cancelamento de viagem:', error);
      return { isCancellation: false };
    }
  }

  /**
   * Analisa se o lead tem intenção de compra/assinatura.
   */
  async parsePurchaseIntent(rawText) {
    if (!process.env.GEMINI_API_KEY) {
      const lower = rawText.toLowerCase();
      return lower.includes('quero') || lower.includes('assinar') || lower.includes('sim') || lower.includes('comprar');
    }

    const prompt = `
      Você é um vendedor entusiasta de um sistema de automação para Van Escolar. 
      O cliente recebeu sua proposta e respondeu: "${rawText}"
      
      Analise se ele demonstrou interesse real em assinar, saber mais, receber o PIX ou testar o sistema.
      Exemplos de interesse: "Quero", "Como faço?", "Aceita PIX?", "Tenho interesse", "Sim".
      
      Retorne EXATAMENTE APENAS um JSON válido (sem markdown):
      {"interested": true ou false}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const textOutput = response.text;
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJsonStr);
      return result.interested === true;
    } catch (error) {
      console.error('[LlmService] Falha ao detectar intenção de compra:', error);
      return false;
    }
  }

  /**
   * Extrai dados estruturados para cadastro de um aluno a partir de texto natural.
   */
  async extractStudentData(rawText) {
    if (!process.env.GEMINI_API_KEY) {
       return { nome: null, turno: 'manha', mensalidade: 0, bairro: null };
    }

    const prompt = `
      Você é um assistente de secretaria para uma van escolar. O motorista quer cadastrar um novo aluno e enviou esta frase:
      "${rawText}"

      Tente extrair o máximo de informações possíveis:
      - Nome do aluno
      - Turno (manha, tarde ou noite)
      - Valor da mensalidade (apenas o número)
      - Bairro ou Endereço básico

      Retorne EXATAMENTE APENAS um JSON válido (sem markdown):
      {
        "nome": "Nome Completo ou null",
        "turno": "manha | tarde | noite",
        "mensalidade": <numero_float_ou_0>,
        "bairro": "Nome do Bairro ou null",
        "telefone_responsavel": "Número se houver ou null"
      }
    `;

    try {
      const response = await GeminiQueueService.enqueue(() => 
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );

      const textOutput = response.text;
      const cleanJsonStr = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[LlmService] Falha ao extrair dados do aluno:', error);
      return { nome: null, turno: 'manha', mensalidade: 0, bairro: null };
    }
  }

  /**
   * Retorna a mensagem de onboarding (Guia de Comandos) para o Motorista.
   */
  getDriverOnboardingMessage(motoristaNome = 'Motorista') {
    return `👋 *Olá, ${motoristaNome}! Bem-vindo ao Gestor de Transporte Escolar AI!* 🚐💨

Eu sou seu assistente inteligente e estou aqui para automatizar toda a sua logística.

🚀 *Para começar agora:*
1. *Me adicione no grupo de WhatsApp com seus passageiros.*
2. Uma vez que eu entrar lá, mandarei automaticamente um link de cadastro para todos.

📋 *Comandos que eu entendo aqui no privado:*
• *Garagem:* Mande "garagem [seu endereço]" para eu saber de onde você sai.
• *Escola:* Mande "escola [nome da escola + endereço]" para salvar seus destinos.
• *Lotação:* Mande "lotacao [manha/tarde/noite] [vagas]" para eu controlar sua ocupação.
• *Financeiro:* Mande qualquer gasto que eu anoto. Ex: "Gastei 150 de diesel".
• *Pausas:* Me avise se for sair de férias ou se for feriado: "Entro de férias dia 10".

💡 *Sempre que você mandar uma mensagem que eu não entenda totalmente, eu te mandarei este guia como lembrete!*

_Sou um cérebro digital, pode falar comigo naturalmente!_ 🧠✨`;
  }
}

module.exports = new LlmService();
