// server/utils/MessageVariation.js
// Templates de mensagens usados pelo bot. As frases ficam simples e seguras
// para combinarem bem com a camada de sinônimos do EvolutionService.

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function money(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}

function upper(value) {
  return String(value || '').toUpperCase();
}

const billingReminders = [
  (name, valor) => `Olá, *${name}*! Tudo bem?\n\nPassando para lembrar que a mensalidade da van vence hoje.\nValor: *R$ ${money(valor)}*.\n\nQuando puder, envie a foto ou PDF do comprovante do Pix por aqui que eu registro no sistema. Obrigado!`,
  (name, valor) => `Oi, *${name}*! Tudo certo?\n\nHoje é o dia combinado para o pagamento da van.\nValor cadastrado: *R$ ${money(valor)}*.\n\nAssim que fizer o Pix, pode mandar o comprovante por aqui para eu dar baixa automaticamente.`,
  (name, valor) => `Opa, *${name}*!\n\nLembrete rápido da mensalidade da van: *R$ ${money(valor)}*.\n\nEnvie o comprovante do Pix neste chat quando concluir o pagamento. Eu confiro e atualizo o painel.`,
  (name, valor) => `Bom dia, *${name}*!\n\nSua mensalidade da van está em aberto no valor de *R$ ${money(valor)}*.\n\nPode enviar o comprovante do Pix por aqui. Assim que eu validar, o pagamento fica registrado.`
];

const receiptApprovals = [
  (name) => `Perfeito, ${name}! O comprovante foi lido e o valor bateu certinho.\n\nPagamento registrado com sucesso. Obrigado!`,
  (name) => `Tudo certo, ${name}. Recebi o comprovante e confirmei o pagamento no sistema.\n\nSua mensalidade está em dia.`,
  (name) => `Comprovante aprovado, ${name}.\n\nO pagamento foi confirmado e a baixa já ficou salva no painel.`,
  (name) => `Obrigado, ${name}! O comprovante foi validado automaticamente.\n\nPagamento registrado.`
];

const receiptFailures = [
  (name) => `${name}, não consegui confirmar esse comprovante automaticamente.\n\nEncaminhei para o motorista verificar no painel. Assim que ele confirmar, o pagamento será atualizado.`,
  (name) => `Opa, ${name}. A leitura automática não conseguiu validar todos os dados do comprovante.\n\nDeixei pendente para conferência manual do motorista.`,
  (name) => `${name}, a imagem ou o valor do comprovante ficou inconsistente para validação automática.\n\nO motorista vai revisar manualmente pelo painel.`,
  (name) => `Não consegui validar esse comprovante com segurança, ${name}.\n\nEle foi enviado para revisão manual do motorista.`
];

const pollAnnouncements = [
  (turno) => `*Chamada da van - ${upper(turno)}*\nConfirme sua presença abaixo:`,
  (turno) => `*Enquete da rota - ${upper(turno)}*\nMarque como vai usar a van hoje:`,
  (turno) => `*Confirmação de presença - ${upper(turno)}*\nEscolha uma opção:`,
  (turno) => `*Rota ${upper(turno)}*\nResponda a enquete para organizar a chamada:`
];

const routeIdaMessages = [
  (turno, qtd, listaPassageiros) => `ROTA DE IDA - ${upper(turno)}\n${qtd} aluno(s) confirmado(s)\n\n1. Base\n${listaPassageiros}\nDestino final: escola`,
  (turno, qtd, listaPassageiros) => `IDA - ${upper(turno)}\n${qtd} passageiro(s) na rota\n\n1. Base (garagem)\n${listaPassageiros}\nChegada: escola`,
  (turno, qtd, listaPassageiros) => `ROTEIRO DE IDA - ${upper(turno)}\n${qtd} confirmado(s) para esse turno\n\n1. Garagem\n${listaPassageiros}\nDestino: escola`
];

const routeVoltaMessages = [
  (turno, qtd, listaPassageiros) => `ROTA DE VOLTA - ${upper(turno)}\n${qtd} aluno(s) confirmado(s)\n\n1. Escola\n${listaPassageiros}\nRetorno: base`,
  (turno, qtd, listaPassageiros) => `VOLTA - ${upper(turno)}\n${qtd} passageiro(s) na rota\n\n1. Escola\n${listaPassageiros}\nDestino final: base`,
  (turno, qtd, listaPassageiros) => `ROTEIRO DE VOLTA - ${upper(turno)}\n${qtd} confirmado(s) para esse turno\n\n1. Escola\n${listaPassageiros}\nChegada: garagem`
];

const routeEmptyMessages = [
  (turno) => `${upper(turno)}: nenhum passageiro confirmou presença na enquete de hoje. Turno livre.`,
  (turno) => `${upper(turno)}: sem passageiros confirmados para esse turno.`,
  (turno) => `${upper(turno)}: a enquete fechou sem confirmações. Não há rota para gerar.`
];

const expenseConfirmations = [
  (categoria, valor, totalMes) => `Anotado! Registrei *R$ ${money(valor)}* em ${categoria}.\nTotal de despesas do mês: *R$ ${money(totalMes)}*.`,
  (categoria, valor, totalMes) => `Despesa salva: *R$ ${money(valor)}* em ${categoria}.\nAcumulado do mês: *R$ ${money(totalMes)}*.`,
  (categoria, valor, totalMes) => `Feito! Lançamento de *R$ ${money(valor)}* em ${categoria} registrado.\nDespesas no mês: *R$ ${money(totalMes)}*.`
];

const profitReports = [
  (nome, mes, receita, despesas, lucro) => `Olá, *${nome}*!\n\nFechamento de *${mes}*:\n\nReceita recebida: R$ ${money(receita)}\nDespesas: R$ ${money(despesas)}\nResultado: R$ ${money(lucro)}\n\nOs detalhes estão no painel.`,
  (nome, mes, receita, despesas, lucro) => `*${nome}*, relatório de *${mes}* pronto.\n\nEntradas: R$ ${money(receita)}\nSaídas: R$ ${money(despesas)}\nLucro líquido: R$ ${money(lucro)}\n\nAcesse o painel para conferir os lançamentos.`,
  (nome, mes, receita, despesas, lucro) => `Resumo financeiro de *${mes}*:\n\nMotorista: ${nome}\nReceita: R$ ${money(receita)}\nDespesas: R$ ${money(despesas)}\nResultado final: R$ ${money(lucro)}`
];

const addressConfirmations = [
  (qtd) => `Tudo pronto! Cadastrei ${qtd} endereço(s) no sistema.\n\nPara trocar o endereço do dia, mande algo como:\n_"trocar endereço ida para Casa do Pai"_`,
  (qtd) => `${qtd} endereço(s) salvo(s) com sucesso.\n\nSe precisar mudar embarque ou desembarque, mande:\n_"trocar endereço volta para Casa da Avó"_`,
  (qtd) => `Endereço(s) registrado(s): ${qtd}.\n\nQuando quiser usar um endereço alternativo, me avise pelo chat.`
];

const addressSwitches = [
  (trecho, apelido) => `Feito! Endereço de *${trecho}* atualizado para *${apelido}*.\n\nEle fica ativo até você pedir outra troca.`,
  (trecho, apelido) => `Anotado! A *${trecho}* agora usa o endereço *${apelido}*.\n\nPara voltar ao padrão, é só me avisar.`,
  (trecho, apelido) => `Endereço alterado: *${trecho}* -> *${apelido}*.\n\nEssa escolha continua valendo até nova alteração.`
];

const addressReminders = [
  (nome, primario, apelidoIda, apelidoVolta) => {
    let detalhe = '';
    if (apelidoIda && apelidoVolta) {
      detalhe = `ida em *${apelidoIda}* e volta em *${apelidoVolta}*`;
    } else if (apelidoIda) {
      detalhe = `ida em *${apelidoIda}* e volta no endereço padrão`;
    } else {
      detalhe = `volta em *${apelidoVolta}* e ida no endereço padrão`;
    }

    return `Bom dia, *${nome}*!\n\nLembrete: você está com endereço alternativo ativo (${detalhe}).\nEndereço padrão: *${primario}*.\n\nPara voltar ao padrão, mande: _"voltar pro endereço padrão"_`;
  },
  (nome, primario, apelidoIda, apelidoVolta) => {
    const detalhe = apelidoIda && apelidoVolta
      ? `ida: *${apelidoIda}* | volta: *${apelidoVolta}*`
      : apelidoIda
        ? `ida: *${apelidoIda}*`
        : `volta: *${apelidoVolta}*`;

    return `Ei, *${nome}*! Seu endereço principal é *${primario}*, mas hoje há um alternativo ativo.\n\n${detalhe}\n\nSe quiser mudar, me mande uma nova instrução.`;
  }
];

const pauseConfirmations = [
  (tipo, dataFim) => `Entendido! Vou pausar enquetes e rotas. Motivo: *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}`,
  (tipo, dataFim) => `Sistema pausado por *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}\n\nNesse período não vou gerar chamadas nem rotas automáticas.`,
  (tipo, dataFim) => `Anotado! Operação em pausa: *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}\n\nQuando voltar, eu retomo as chamadas normalmente.`
];

const pauseResumptions = [
  () => `Sistema reativado. As enquetes e rotas voltam a seguir a programação normal.`,
  () => `Pronto! A pausa foi encerrada e as chamadas automáticas estão ativas novamente.`,
  () => `Tudo certo! A operação da van voltou ao modo normal.`
];

const proactiveHolidays = [
  (feriadoNome, data) => `Olá! No calendário consta feriado em *${data}*: *${feriadoNome}*.\n\nA van vai rodar nesse dia ou posso pausar as enquetes? Responda "vai rodar" ou "pausar".`,
  (feriadoNome, data) => `Aviso de calendário: *${data}* está marcado como *${feriadoNome}*.\n\nQuer manter a rota normal ou pausar as chamadas desse dia?`,
  (feriadoNome, data) => `Encontrei um feriado em *${data}* (${feriadoNome}).\n\nMe confirme se a van roda normalmente ou se devo pausar esse dia.`
];

const trackingArriving = [
  (nome) => `*${nome}*, a van está bem perto do seu ponto. Pode se preparar para embarcar.`,
  (nome) => `Aviso para *${nome}*: o motorista está chegando ao seu endereço.`,
  (nome) => `*${nome}*, a van está a poucos minutos. Fique pronto(a) no ponto combinado.`,
  (nome) => `*${nome}*, chegada próxima. Aguarde no local de embarque.`
];

const trackingNearby = [
  (nome) => `*${nome}*, a van já está na sua região. Comece a se preparar para o embarque.`,
  (nome) => `Aviso para *${nome}*: o motorista está se aproximando do seu bairro.`,
  (nome) => `*${nome}*, a rota já está perto do seu ponto. Fique atento(a).`,
  (nome) => `*${nome}*, a van está a caminho do seu endereço. Prepare-se com calma.`
];

const trackingRequestLocation = [
  () => `Agora compartilhe sua localização em tempo real por 2 horas para eu acompanhar a rota e avisar os passageiros.`,
  () => `Compartilhe a localização em tempo real por 2 horas. Assim eu acompanho a rota e envio os avisos automaticamente.`,
  () => `Para ativar os avisos de chegada, envie sua localização em tempo real por 2 horas pelo WhatsApp.`
];

const trackingRouteFinished = [
  (trecho, qtd) => `Rota de ${upper(trecho)} finalizada. ${qtd} passageiro(s) recolhido(s) com sucesso.`,
  (trecho, qtd) => `${upper(trecho)} concluída. ${qtd} aluno(s) embarcado(s).`,
  (trecho, qtd) => `Trecho ${upper(trecho)} encerrado. Total confirmado no trajeto: ${qtd}.`
];

const trackingRadiusChanged = [
  (km) => `Raio de notificação atualizado para *${km}km*. Vou avisar os alunos quando a van estiver nessa distância.`,
  (km) => `Feito! O aviso de chegada será enviado quando faltar aproximadamente *${km}km*.`,
  (km) => `Novo raio salvo: *${km}km*. As notificações seguem essa distância a partir de agora.`
];

const trackingSchoolArrival = [
  (escolaNome) => `A van está chegando na ${escolaNome}. Quem confirmou volta já pode se dirigir ao ponto combinado.`,
  (escolaNome) => `Aviso de chegada: a van está se aproximando da ${escolaNome}. Passageiros da volta, preparem-se.`,
  (escolaNome) => `A rota chegou perto da ${escolaNome}. Quem vai voltar de van deve aguardar no local de embarque.`
];

const askCapacityMessages = [
  (nome) => `Muito prazer, ${nome}!\n\nPara configurar sua van, me diga: *qual é a capacidade de passageiros por turno?*\nExemplo: "15 de manhã e 12 à tarde".`,
  (nome) => `Bem-vindo, ${nome}.\n\nQuantos lugares sua van tem em cada turno? Pode responder por texto ou áudio.`,
  (nome) => `${nome}, para montar seu perfil preciso da lotação da van.\n\nInforme a capacidade por turno. Exemplo: "20 de manhã, 15 à tarde".`
];

const askGarageMessages = [
  () => `Anotado! Agora me envie o endereço da sua garagem ou base de saída.\n\nExemplo: Rua das Flores, 123, Bairro.`,
  () => `Capacidade registrada.\n\nQual é o endereço de onde a van costuma sair para iniciar a rota?`,
  () => `Perfeito! Agora preciso do ponto inicial da rota: endereço da garagem, casa ou base da van.`
];

const askSchoolMessages = [
  () => `Base salva.\n\nAgora me envie o endereço da escola ou destino principal dos alunos.`,
  () => `Garagem registrada.\n\nQual é a escola ou instituição principal atendida pela van? Pode mandar nome e cidade ou endereço completo.`,
  () => `Falta o destino principal.\n\nMe diga o nome ou endereço da escola/faculdade para onde a maioria dos alunos vai.`
];

const errCapacityMessages = [
  () => `Não consegui identificar a capacidade da van. Pode mandar só os números por turno? Exemplo: "15 de manhã e 10 à tarde".`,
  () => `Preciso da lotação em números para continuar. Exemplo: "20 lugares de manhã, 12 à tarde".`,
  () => `Não ficou claro quantas vagas a van tem. Me envie a capacidade por turno, por favor.`
];

const errAddressMessages = [
  (tipo) => `Não encontrei o endereço da ${tipo} no mapa. Envie um endereço completo com rua, número, bairro e cidade.`,
  (tipo) => `Não consegui localizar a ${tipo}. Pode mandar com mais detalhes? Exemplo: rua, número, bairro e cidade.`,
  (tipo) => `O mapa não validou esse endereço da ${tipo}. Tente enviar o endereço completo, por favor.`
];

const salesPitchMessages = [
  (valor) => `Olá! Sou o VANBORA, assistente de IA para transporte escolar.\n\nEu ajudo sua van com:\n- Enquetes automáticas de presença\n- Rotas organizadas por turno\n- Avisos de chegada com localização\n- Controle de mensalidades e comprovantes\n\nPlano: *R$ ${money(valor)}/mês*.\n\nResponda *QUERO ASSINAR* para começar.`,
  (valor) => `Oi! O VANBORA organiza a rotina da sua van escolar.\n\nCom ele você acompanha presença, rotas, avisos aos passageiros e financeiro em um painel simples.\n\nValor mensal: *R$ ${money(valor)}*.\n\nPara ativar, mande *QUERO ASSINAR*.`,
  (valor) => `Quer automatizar a chamada da van e reduzir mensagens manuais?\n\nO VANBORA envia enquetes, monta rotas, pede localização em tempo real e ajuda no financeiro.\n\nAssinatura: *R$ ${money(valor)}/mês*.\n\nDigite *QUERO ASSINAR* para seguir.`
];

const salesPaymentMessages = [
  (valor, tipo, chave) => `Excelente. Para ativar seu acesso, faça o pagamento da primeira mensalidade:\n\nValor: *R$ ${money(valor)}*\nChave Pix (${tipo}): *${chave}*\n\nDepois envie a foto ou PDF do comprovante por aqui. Eu valido e sigo com sua configuração.`,
  (valor, tipo, chave) => `Vamos ativar sua conta.\n\nPagamento inicial: *R$ ${money(valor)}*\nPix (${tipo}): *${chave}*\n\nAssim que concluir, mande o comprovante neste chat para validação.`,
  (valor, tipo, chave) => `Para liberar o VANBORA, realize o Pix abaixo:\n\nValor: *R$ ${money(valor)}*\nChave (${tipo}): *${chave}*\n\nEnvie o comprovante aqui no chat. Após a validação, eu inicio seu cadastro.`
];

const salesSuccessMessages = [
  () => `Pagamento confirmado!\n\nSua assinatura está ativa. Agora vou fazer algumas perguntas rápidas para configurar sua van.\n\nPara começar: *qual é o seu nome completo ou nome da van?*`,
  () => `Comprovante validado com sucesso.\n\nVamos concluir seu perfil para liberar o painel e as automações.\n\nPrimeira pergunta: *como devo chamar você ou sua van?*`,
  () => `Deu certo, pagamento aprovado.\n\nAgora preciso configurar seus dados de operação.\n\nQual é o seu nome completo ou nome comercial da van?`
];

const salesErrorMessages = [
  (valorEsperado) => `Não consegui validar esse comprovante. Verifique se a imagem está nítida e se o valor é *R$ ${money(valorEsperado)}*. Depois envie novamente.`,
  (valorEsperado) => `A leitura do comprovante não confirmou o pagamento. Confira se o valor pago foi *R$ ${money(valorEsperado)}* e mande outro print ou PDF.`,
  (valorEsperado) => `Esse comprovante ficou pendente de validação. Envie uma imagem mais clara ou um PDF com o valor de *R$ ${money(valorEsperado)}*.`
];

module.exports = {
  pick,
  financeiro: {
    cobranca: (name, valor) => pick(billingReminders)(name, valor),
    sucesso: (name) => pick(receiptApprovals)(name),
    falha: (name) => pick(receiptFailures)(name)
  },
  logistica: {
    pollHeader: (turno) => pick(pollAnnouncements)(turno),
    rotaIda: (turno, qtd, listaPassageiros) => pick(routeIdaMessages)(turno, qtd, listaPassageiros),
    rotaVolta: (turno, qtd, listaPassageiros) => pick(routeVoltaMessages)(turno, qtd, listaPassageiros),
    turnoLivre: (turno) => pick(routeEmptyMessages)(turno)
  },
  despesas: {
    confirmacao: (categoria, valor, totalMes) => pick(expenseConfirmations)(categoria, valor, totalMes),
    relatorio: (nome, mes, receita, despesas, lucro) => pick(profitReports)(nome, mes, receita, despesas, lucro)
  },
  enderecos: {
    confirmacao: (qtd) => pick(addressConfirmations)(qtd),
    troca: (trecho, apelido) => pick(addressSwitches)(trecho, apelido),
    lembreteAlternativo: (nome, primario, apelidoIda, apelidoVolta) => pick(addressReminders)(nome, primario, apelidoIda, apelidoVolta)
  },
  pausas: {
    confirmacao: (tipo, dataFim) => pick(pauseConfirmations)(tipo, dataFim),
    retorno: () => pick(pauseResumptions)(),
    feriadoProativo: (nome, data) => pick(proactiveHolidays)(nome, data)
  },
  rastreamento: {
    vanChegando: (nome) => pick(trackingArriving)(nome),
    vanProxima: (nome) => pick(trackingNearby)(nome),
    pedirLocalizacao: () => pick(trackingRequestLocation)(),
    rotaFinalizada: (trecho, qtd) => pick(trackingRouteFinished)(trecho, qtd),
    raioAlterado: (km) => pick(trackingRadiusChanged)(km),
    vanChegandoEscola: (escolaNome) => pick(trackingSchoolArrival)(escolaNome)
  },
  onboardingMotorista: {
    perguntaLotacao: (nome) => pick(askCapacityMessages)(nome),
    perguntaGaragem: () => pick(askGarageMessages)(),
    perguntaEscola: () => pick(askSchoolMessages)(),
    erroLotacao: () => pick(errCapacityMessages)(),
    erroEndereco: (tipo) => pick(errAddressMessages)(tipo)
  },
  vendasMotorista: {
    pitch: (valor) => pick(salesPitchMessages)(valor),
    instrucoesPagamento: (valor, tipo, chave) => pick(salesPaymentMessages)(valor, tipo, chave),
    sucessoPagamento: () => pick(salesSuccessMessages)(),
    erroRecibo: (valorEsperado) => pick(salesErrorMessages)(valorEsperado)
  }
};
