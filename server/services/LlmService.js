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
   * Extrai a lotação da van informada pelo motorista (capacidade por turno)
   */
  async parseDriverCapacity(rawText) {
    if (!process.env.GEMINI_API_KEY) {
       console.warn('[LlmService] GEMINI_API_KEY ausente. Usando mock manual para parseDriverCapacity.');
       const match = rawText.match(/\d+/);
       const val = match ? parseInt(match[0]) : 0;
       return { isCapacity: true, manha: val, tarde: val, noite: val };
    }

    const prompt = `
      Você é um assistente configurando uma van escolar.
      O motorista respondeu com a capacidade/lotação da van: "${rawText}"
      
      Extraia a capacidade de passageiros informada para cada turno.
      Se ele forneceu apenas um número geral (ex: "levo 15 pessoas", "minha van é de 20 lugares"), assuma esse valor para TODOS os turnos principais.
      Se ele separou por turno (ex: "10 de manha e 15 a tarde"), extraia corretamente.

      Retorne APENAS um JSON estruturado assim (sem markdown):
      {
        "isCapacity": true,
        "manha": <numero>,
        "tarde": <numero>,
        "noite": <numero>
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
      console.error('[LlmService] Falha ao derivar capacidade da van:', error);
      return { isCapacity: false, manha: 0, tarde: 0, noite: 0 };
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
   * Analisa o turno informado pelo passageiro e padroniza para: Manhã, Tarde ou Noite.
   */
  async parseShift(rawText) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[LlmService] GEMINI_API_KEY ausente. Usando mock para parseShift.');
      const lower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes('manha') || lower.includes('cedo') || lower.includes('am')) return { shift: 'Manhã', confidence: 100 };
      if (lower.includes('tarde') || lower.includes('pm')) return { shift: 'Tarde', confidence: 100 };
      if (lower.includes('noite') || lower.includes('escuro')) return { shift: 'Noite', confidence: 100 };
      return { shift: 'UNKNOWN', confidence: 0 };
    }

    const prompt = `
      Você é um assistente de uma van escolar. O passageiro/aluno está informando o período em que estuda.
      Entrada do usuário: "${rawText}"

      Sua tarefa é categorizar essa entrada em um dos três turnos abaixo:
      - "Manhã"
      - "Tarde"
      - "Noite"

      Regras:
      1. Se a entrada for ambígua ou contiver erros de áudio (ex: "mãe, ã", "manha", "cedo"), identifique o turno mais provável (ex: "Manhã").
      2. Se não houver clareza suficiente para decidir entre os 3, retorne "UNKNOWN".
      3. Importante: "Integral" NÃO é mais aceito, se ele disser integral, tente identificar se ele quer dizer que vai nos dois principais ou retorne "UNKNOWN".

      Retorne EXATAMENTE APENAS um JSON válido (sem markdown):
      {
        "shift": "Manhã | Tarde | Noite | UNKNOWN",
        "confidence": <0 a 100>
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
      console.error('[LlmService] Falha ao extrair turno:', error);
      return { shift: 'UNKNOWN', confidence: 0 };
    }
  }

  /**
   * Tenta extrair o nome de um bairro de um texto de endereço bruto.
   */
  async extractNeighborhood(rawText) {
    if (!process.env.GEMINI_API_KEY) {
      return null;
    }

    const prompt = `
      Sua tarefa é extrair o NOME DO BAIRRO de um endereço escrito por um usuário de van escolar.
      Texto: "${rawText}"

      Regra:
      - Retorne APENAS o nome do bairro (ex: Centro, Jardins, Bairro Novo).
      - Se não houver um bairro claro, retorne "null".
      - Não invente informações.
      - Retorne APENAS a string pura, sem JSON e sem markdown.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text.trim();
      return (text.toLowerCase() === 'null') ? null : text;
    } catch (error) {
      console.error('[LlmService] Falha ao extrair bairro via IA:', error);
      return null;
    }
  }

  /**
   * Retorna a mensagem de onboarding (Guia de Comandos) para o Motorista.
   */
  getDriverOnboardingMessage(motoristaNome = 'Motorista') {
    return `🎉 *NÃO TEM MAIS PERGUNTAS!* FINALIZAMOS AS CONFIGURAÇÕES!

👋 *Pronto, ${motoristaNome}! Tudo configurado no VANBORA!* 🚐💨

Eu sou o VANBORA, o seu assistente inteligente, e estou aqui no seu privado para comandar a sua logística.

🚀 *Último passo para ativarmos o robô:*
1. *Me adicione agora mesmo no grupo de WhatsApp com os seus passageiros.*
2. Assim que eu entrar lá, irei mandar automaticamente um link mágico para os familiares preencherem suas vagas e endereços (eu cruzarei isso com a sua lotação!).

💡 *Lembrete:* Se um dia você precisar alterar sua Garagem, Escola ou Lotação, além de anotar despesas ou registrar férias, basta me dizer aqui no privado (por texto ou áudio) de forma natural, ex: _"Muda a minha garagem para a rua X"_.
Eu leio tudo com Inteligência Artificial! 🧠✨`;
  }

  /**
   * Retorna o tutorial das funcionalidades do sistema.
   */
  getDriverTutorialMessage() {
    return `📚 *TUTORIAL DE FUNCIONALIDADES* 📚

Aqui está o que eu faço por você no dia a dia com Inteligência Artificial:

📍 *1. Iniciar Rota (Notificações GPS)*
Quando for sair, me mande: *"Iniciar ida"* ou *"Iniciar volta"*.
Eu pedirei para você compartilhar sua localização em tempo real no WhatsApp. A partir daí analisarei o mapa e avisarei os passageiros no grupo conforme você for chegando perto da casa de cada um!

📊 *2. Enquetes Automáticas (Presença)*
Todo dia, nos turnos corretos, eu mando sozinho uma enquete no seu grupo da Van pro pessoal votar se vai ou não vai.
Eu conto os alunos e cruzo com o limite de vagas disponíveis que você configurou.

💸 *3. Gestão Financeira e Despesas (Por áudio)*
Gastou um dinheiro com a Van? Me mande um áudio falando: *"Gastei 150 reais para arrumar o pneu furado"*. Eu anoto na sua gestão de custos local.
Os passageiros vão lhe enviar o comprovante Pix do final do mês pra mim e eu também reconheço o pix, bato os valores, verifico se é fraude e lhes dou o recibo oficial.

🏖️ *4. Férias e Feriados*
Surgiu um feriado ou você vai emendar a semana do saco cheio?
Me mande: *"Vou parar na semana que vem e volto dia 15"*. Eu coloco minha operação em pausa e paro de mandar enquetes até o dia determinado pra não incomodar seus clientes!

Guarde essas dicas aqui no meu contato. Muito sucesso pra nós! 😉`;
  }
  /**
   * Retorna o tutorial das funcionalidades do sistema.
   * Mantemos esta segunda definicao no fim da classe para sobrescrever a versao
   * antiga caso o arquivo tenha trechos legados com encoding inconsistente.
   */
  getDriverTutorialMessage(motoristaNome = 'Motorista') {
    const painelUrl = process.env.PAINEL_URL || process.env.FRONTEND_URL || 'http://localhost:5173/login';

    return `📘 *GUIA RÁPIDO DO VANBORA*

👋 ${motoristaNome}, segue um resumo do que você pode fazer comigo no privado:

*1. Comandos diretos*
- *garagem Rua X, 123, Bairro - Cidade* -> define sua base de saída
- *escola Nome da escola, Cidade - UF* -> define o destino principal
- *lotacao manha 15*
- *lotacao tarde 12*
- *lotacao noite 8*
- *raio 1.5* -> altera o raio de aviso em km

*2. Rastreamento ao vivo*
Quando a rota do turno já estiver pronta, basta compartilhar sua localização em tempo real no WhatsApp. A primeira localização recebida já inicia o acompanhamento automaticamente, sem precisar mandar comando de texto.

*3. Enquetes e confirmações*
Eu envio as enquetes diárias no grupo, fecho a contagem e monto a rota. Se algum passageiro confirmar depois no meu privado, eu atualizo a rota e te mando a ordem recalculada.

*4. Despesas e financeiro*
Pode me mandar texto ou áudio como:
- *gastei 150 com gasolina*
- *paguei 80 no pneu*
Eu registro a despesa no seu financeiro.

*5. Pausas da operação*
Você pode falar naturalmente, por exemplo:
- *vou parar até dia 15*
- *amanhã é feriado*
- *voltei a rodar hoje*
Eu ajusto férias, recesso e retorno.

*6. Painel*
Seu painel fica em:
${painelUrl}

Lá você acompanha alunos, financeiro, configurações e dados da van.

Se quiser reconfigurar algo, é só me mandar aqui no privado.`;
  }
}

module.exports = new LlmService();
