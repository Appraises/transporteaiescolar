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
  (name, valor) => `💰 Olá, *${name}*! Tudo bem?\n\nPassando para lembrar que a mensalidade da van vence hoje.\nValor: *R$ ${money(valor)}*.\n\nQuando puder, envie a foto ou PDF do comprovante do Pix por aqui que eu registro no sistema. Obrigado!`,
  (name, valor) => `🧾 Oi, *${name}*! Tudo certo?\n\nHoje é o dia combinado para o pagamento da van.\nValor cadastrado: *R$ ${money(valor)}*.\n\nAssim que fizer o Pix, pode mandar o comprovante por aqui para eu dar baixa automaticamente.`,
  (name, valor) => `💳 Opa, *${name}*!\n\nLembrete rápido da mensalidade da van: *R$ ${money(valor)}*.\n\nEnvie o comprovante do Pix neste chat quando concluir o pagamento. Eu confiro e atualizo o painel.`,
  (name, valor) => `💰 Bom dia, *${name}*!\n\nSua mensalidade da van está em aberto no valor de *R$ ${money(valor)}*.\n\nPode enviar o comprovante do Pix por aqui. Assim que eu validar, o pagamento fica registrado.`,
  (name, valor) => `🧾 Olá, *${name}*! Tudo bem?\n\nA mensalidade da van vence hoje e está no valor de *R$ ${money(valor)}*.\n\nQuando puder, mande o comprovante do Pix por aqui para eu registrar o pagamento.`,
  (name, valor) => `💳 *${name}*, passando para lembrar do pagamento da van.\n\nValor da mensalidade: *R$ ${money(valor)}*.\n\nDepois do Pix, envie o comprovante por aqui que eu deixo tudo atualizado.`,
  (name, valor) => `💰 Oi, *${name}*!\n\nHoje consta vencimento da mensalidade da van.\nValor: *R$ ${money(valor)}*.\n\nPode mandar a foto ou PDF do comprovante do Pix neste chat quando concluir.`,
  (name, valor) => `🧾 Bom dia, *${name}*.\n\nLembrete da mensalidade em aberto: *R$ ${money(valor)}*.\n\nAssim que pagar, envie o comprovante do Pix por aqui para confirmação.`
];

const receiptApprovals = [
  (name) => `✅ Perfeito, ${name}! O comprovante foi lido e o valor bateu certinho.\n\nPagamento registrado com sucesso. Obrigado!`,
  (name) => `✅ Tudo certo, ${name}. Recebi o comprovante e confirmei o pagamento no sistema.\n\nSua mensalidade está em dia.`,
  (name) => `✅ Comprovante aprovado, ${name}.\n\nO pagamento foi confirmado e a baixa já ficou salva no painel.`,
  (name) => `✅ Obrigado, ${name}! O comprovante foi validado automaticamente.\n\nPagamento registrado.`,
  (name) => `✅ Perfeito, ${name}. O comprovante foi conferido e a mensalidade ficou marcada como paga.`,
  (name) => `✅ ${name}, pagamento confirmado.\n\nO comprovante foi aceito e o registro já está salvo no painel.`,
  (name) => `✅ Tudo certo, ${name}! A baixa da mensalidade foi feita com sucesso.`,
  (name) => `✅ Comprovante recebido e validado, ${name}.\n\nPagamento registrado no sistema.`
];

const receiptFailures = [
  (name) => `⚠️ ${name}, não consegui confirmar esse comprovante automaticamente.\n\nEncaminhei para o motorista verificar no painel. Assim que ele confirmar, o pagamento será atualizado.`,
  (name) => `⚠️ Opa, ${name}. A leitura automática não conseguiu validar todos os dados do comprovante.\n\nDeixei pendente para conferência manual do motorista.`,
  (name) => `⚠️ ${name}, a imagem ou o valor do comprovante ficou inconsistente para validação automática.\n\nO motorista vai revisar manualmente pelo painel.`,
  (name) => `⚠️ Não consegui validar esse comprovante com segurança, ${name}.\n\nEle foi enviado para revisão manual do motorista.`,
  (name) => `⚠️ ${name}, esse comprovante precisa de conferência manual.\n\nAvisei o motorista para revisar pelo painel.`,
  (name) => `⚠️ Recebi o comprovante, ${name}, mas a validação automática não conseguiu confirmar o pagamento.\n\nO motorista vai analisar manualmente.`,
  (name) => `⚠️ ${name}, não deu para confirmar o valor do comprovante automaticamente.\n\nDeixei o pagamento pendente para revisão do motorista.`
];

const pollAnnouncements = [
  (turno) => `🚌 *Chamada da van - ${upper(turno)}*\nConfirme sua presença abaixo 👇`,
  (turno) => `📋 *Enquete da rota - ${upper(turno)}*\nMarque como vai usar a van hoje 👇`,
  (turno) => `✅ *Confirmação de presença - ${upper(turno)}*\nEscolha uma opção abaixo:`,
  (turno) => `🚐 *Rota ${upper(turno)}*\nResponda a enquete para organizar a chamada 👇`,
  (turno) => `🚌 *Presença na van - ${upper(turno)}*\nSelecione a opção que combina com sua ida ou volta:`,
  (turno) => `📍 *Organização da rota - ${upper(turno)}*\nMarque sua presença para o motorista montar o trajeto:`,
  (turno) => `📋 *Chamada do turno - ${upper(turno)}*\nResponda abaixo para confirmar se vai usar a van:`,
  (turno) => `✅ *Enquete de presença - ${upper(turno)}*\nEscolha sua opção para a rota de hoje 👇`
];

const routeIdaMessages = [
  (turno, qtd, listaPassageiros) => `🚌 ROTA DE IDA - ${upper(turno)}\n👥 ${qtd} aluno(s) confirmado(s)\n\n1. 🏠 Base\n${listaPassageiros}\n🏫 Destino final: escola`,
  (turno, qtd, listaPassageiros) => `🚐 IDA - ${upper(turno)}\n👥 ${qtd} passageiro(s) na rota\n\n1. 🏠 Base (garagem)\n${listaPassageiros}\n🏫 Chegada: escola`,
  (turno, qtd, listaPassageiros) => `📍 ROTEIRO DE IDA - ${upper(turno)}\n👥 ${qtd} confirmado(s) para esse turno\n\n1. 🏠 Garagem\n${listaPassageiros}\n🏫 Destino: escola`,
  (turno, qtd, listaPassageiros) => `🚐 IDA - ${upper(turno)}\n👥 ${qtd} aluno(s) na chamada\n\n1. 🏠 Saída da base\n${listaPassageiros}\n🏫 Final: escola`,
  (turno, qtd, listaPassageiros) => `🚌 ROTA DE IDA - ${upper(turno)}\n👥 Confirmados: ${qtd}\n\n1. 🏠 Base da van\n${listaPassageiros}\n🏫 Último ponto: escola`,
  (turno, qtd, listaPassageiros) => `📍 TRAJETO DE IDA - ${upper(turno)}\n👥 ${qtd} passageiro(s) confirmado(s)\n\n1. 🏠 Garagem\n${listaPassageiros}\n🏫 Destino final: escola`
];

const routeVoltaMessages = [
  (turno, qtd, listaPassageiros) => `🚌 ROTA DE VOLTA - ${upper(turno)}\n👥 ${qtd} aluno(s) confirmado(s)\n\n1. 🏫 Escola\n${listaPassageiros}\n🏠 Retorno: base`,
  (turno, qtd, listaPassageiros) => `🚐 VOLTA - ${upper(turno)}\n👥 ${qtd} passageiro(s) na rota\n\n1. 🏫 Escola\n${listaPassageiros}\n🏠 Destino final: base`,
  (turno, qtd, listaPassageiros) => `📍 ROTEIRO DE VOLTA - ${upper(turno)}\n👥 ${qtd} confirmado(s) para esse turno\n\n1. 🏫 Escola\n${listaPassageiros}\n🏠 Chegada: garagem`,
  (turno, qtd, listaPassageiros) => `🚐 VOLTA - ${upper(turno)}\n👥 Confirmados: ${qtd}\n\n1. 🏫 Saída da escola\n${listaPassageiros}\n🏠 Final: base`,
  (turno, qtd, listaPassageiros) => `🚌 ROTA DE VOLTA - ${upper(turno)}\n👥 ${qtd} passageiro(s) na chamada\n\n1. 🏫 Escola\n${listaPassageiros}\n🏠 Último ponto: garagem`,
  (turno, qtd, listaPassageiros) => `📍 TRAJETO DE VOLTA - ${upper(turno)}\n👥 ${qtd} aluno(s) confirmado(s)\n\n1. 🏫 Escola\n${listaPassageiros}\n🏠 Destino final: base`
];

const routeEmptyMessages = [
  (turno) => `📭 ${upper(turno)}: nenhum passageiro confirmou presença na enquete de hoje. Turno livre.`,
  (turno) => `📭 ${upper(turno)}: sem passageiros confirmados para esse turno.`,
  (turno) => `📭 ${upper(turno)}: a enquete fechou sem confirmações. Não há rota para gerar.`,
  (turno) => `📭 ${upper(turno)}: chamada encerrada sem alunos confirmados. Turno livre.`,
  (turno) => `📭 ${upper(turno)}: ninguém marcou presença na enquete. Sem rota nesse turno.`,
  (turno) => `📭 ${upper(turno)}: não houve confirmações para a rota de hoje.`
];

const expenseConfirmations = [
  (categoria, valor, totalMes) => `💸 Anotado! Registrei *R$ ${money(valor)}* em ${categoria}.\nTotal de despesas do mês: *R$ ${money(totalMes)}*.`,
  (categoria, valor, totalMes) => `💸 Despesa salva: *R$ ${money(valor)}* em ${categoria}.\nAcumulado do mês: *R$ ${money(totalMes)}*.`,
  (categoria, valor, totalMes) => `💸 Feito! Lançamento de *R$ ${money(valor)}* em ${categoria} registrado.\nDespesas no mês: *R$ ${money(totalMes)}*.`,
  (categoria, valor, totalMes) => `💸 Tudo certo! Salvei *R$ ${money(valor)}* como despesa de ${categoria}.\nTotal do mês até agora: *R$ ${money(totalMes)}*.`,
  (categoria, valor, totalMes) => `💸 Despesa registrada em ${categoria}: *R$ ${money(valor)}*.\nSoma das despesas no mês: *R$ ${money(totalMes)}*.`,
  (categoria, valor, totalMes) => `💸 Anotado! Esse gasto de *R$ ${money(valor)}* entrou em ${categoria}.\nAcumulado mensal: *R$ ${money(totalMes)}*.`
];

const profitReports = [
  (nome, mes, receita, despesas, lucro) => `Olá, *${nome}*!\n\nFechamento de *${mes}*:\n\nReceita recebida: R$ ${money(receita)}\nDespesas: R$ ${money(despesas)}\nResultado: R$ ${money(lucro)}\n\nOs detalhes estão no painel.`,
  (nome, mes, receita, despesas, lucro) => `*${nome}*, relatório de *${mes}* pronto.\n\nEntradas: R$ ${money(receita)}\nSaídas: R$ ${money(despesas)}\nLucro líquido: R$ ${money(lucro)}\n\nAcesse o painel para conferir os lançamentos.`,
  (nome, mes, receita, despesas, lucro) => `Resumo financeiro de *${mes}*:\n\nMotorista: ${nome}\nReceita: R$ ${money(receita)}\nDespesas: R$ ${money(despesas)}\nResultado final: R$ ${money(lucro)}`,
  (nome, mes, receita, despesas, lucro) => `Olá, *${nome}*.\n\nResultado de *${mes}*:\n\nMensalidades recebidas: R$ ${money(receita)}\nDespesas registradas: R$ ${money(despesas)}\nSaldo final: R$ ${money(lucro)}\n\nO painel tem a lista completa.`,
  (nome, mes, receita, despesas, lucro) => `Fechamento financeiro de *${mes}* pronto.\n\nReceita: R$ ${money(receita)}\nDespesas: R$ ${money(despesas)}\nResultado: R$ ${money(lucro)}\n\nMotorista: ${nome}.`,
  (nome, mes, receita, despesas, lucro) => `*${nome}*, segue o resumo de *${mes}*:\n\nRecebido: R$ ${money(receita)}\nGastos: R$ ${money(despesas)}\nResultado líquido: R$ ${money(lucro)}\n\nConfira os detalhes no painel.`
];

const addressConfirmations = [
  (qtd) => `Tudo pronto! Cadastrei ${qtd} endereço(s) no sistema.\n\nPara trocar o endereço do dia, mande algo como:\n_"trocar endereço ida para Casa do Pai"_`,
  (qtd) => `${qtd} endereço(s) salvo(s) com sucesso.\n\nSe precisar mudar embarque ou desembarque, mande:\n_"trocar endereço volta para Casa da Avó"_`,
  (qtd) => `Endereço(s) registrado(s): ${qtd}.\n\nQuando quiser usar um endereço alternativo, me avise pelo chat.`,
  (qtd) => `Tudo certo! Salvei ${qtd} endereço(s) para esse aluno.\n\nSe precisar trocar por um dia, é só mandar a instrução no chat.`,
  (qtd) => `Cadastro de endereço concluído: ${qtd} endereço(s) salvo(s).\n\nVocê pode pedir troca de ida ou volta quando precisar.`,
  (qtd) => `${qtd} endereço(s) ficaram registrados no sistema.\n\nPara usar um endereço diferente em algum trajeto, me envie a troca por aqui.`
];

const addressSwitches = [
  (trecho, apelido) => `Feito! Endereço de *${trecho}* atualizado para *${apelido}*.\n\nEle fica ativo até você pedir outra troca.`,
  (trecho, apelido) => `Anotado! A *${trecho}* agora usa o endereço *${apelido}*.\n\nPara voltar ao padrão, é só me avisar.`,
  (trecho, apelido) => `Endereço alterado: *${trecho}* -> *${apelido}*.\n\nEssa escolha continua valendo até nova alteração.`,
  (trecho, apelido) => `Tudo pronto! Para *${trecho}*, vou usar o endereço *${apelido}*.\n\nSe mudar de ideia, mande uma nova troca.`,
  (trecho, apelido) => `Troca registrada: *${trecho}* ficará com *${apelido}*.\n\nO endereço padrão continua salvo para quando você quiser voltar.`,
  (trecho, apelido) => `Combinado! Atualizei a *${trecho}* para o endereço *${apelido}*.\n\nEssa configuração segue ativa até outro pedido.`
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
  },
  (nome, primario, apelidoIda, apelidoVolta) => {
    const detalhe = apelidoIda && apelidoVolta
      ? `ida em *${apelidoIda}* e volta em *${apelidoVolta}*`
      : apelidoIda
        ? `ida em *${apelidoIda}*`
        : `volta em *${apelidoVolta}*`;

    return `Olá, *${nome}*! Tudo bem?\n\nHoje há endereço alternativo ativo: ${detalhe}.\nEndereço principal: *${primario}*.\n\nPara voltar ao padrão, me avise por aqui.`;
  },
  (nome, primario, apelidoIda, apelidoVolta) => {
    const detalhe = apelidoIda && apelidoVolta
      ? `Ida: *${apelidoIda}*\nVolta: *${apelidoVolta}*`
      : apelidoIda
        ? `Ida: *${apelidoIda}*`
        : `Volta: *${apelidoVolta}*`;

    return `Lembrete para *${nome}*:\n\n${detalhe}\nEndereço padrão: *${primario}*.\n\nSe precisar ajustar, mande a nova orientação neste chat.`;
  }
];

const pauseConfirmations = [
  (tipo, dataFim) => `⏸️ Entendido! Vou pausar enquetes e rotas. Motivo: *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}`,
  (tipo, dataFim) => `⏸️ Sistema pausado por *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}\n\nNesse período não vou gerar chamadas nem rotas automáticas.`,
  (tipo, dataFim) => `⏸️ Anotado! Operação em pausa: *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}\n\nQuando voltar, eu retomo as chamadas normalmente.`,
  (tipo, dataFim) => `⏸️ Combinado! As enquetes e rotas ficam pausadas por *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}`,
  (tipo, dataFim) => `⏸️ Pausa registrada: *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}\n\nNão vou disparar chamadas automáticas nesse período.`,
  (tipo, dataFim) => `⏸️ Tudo certo! A rotina automática da van está pausada por *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}`
];

const pauseResumptions = [
  () => `▶️ Sistema reativado. As enquetes e rotas voltam a seguir a programação normal.`,
  () => `▶️ Pronto! A pausa foi encerrada e as chamadas automáticas estão ativas novamente.`,
  () => `▶️ Tudo certo! A operação da van voltou ao modo normal.`,
  () => `▶️ Pausa encerrada. A partir de agora, as enquetes e rotas seguem os horários configurados.`,
  () => `▶️ Operação reativada. Vou voltar a enviar chamadas, fechar enquetes e montar rotas normalmente.`,
  () => `▶️ Combinado! O sistema voltou ao funcionamento normal da van.`
];

const proactiveHolidays = [
  (feriadoNome, data) => `📅 Olá! No calendário consta feriado em *${data}*: *${feriadoNome}*.\n\nA van vai rodar nesse dia ou posso pausar as enquetes? Responda "vai rodar" ou "pausar".`,
  (feriadoNome, data) => `📅 Aviso de calendário: *${data}* está marcado como *${feriadoNome}*.\n\nQuer manter a rota normal ou pausar as chamadas desse dia?`,
  (feriadoNome, data) => `📅 Encontrei um feriado em *${data}* (${feriadoNome}).\n\nMe confirme se a van roda normalmente ou se devo pausar esse dia.`,
  (feriadoNome, data) => `📅 Olá! Para *${data}*, o calendário mostra *${feriadoNome}*.\n\nA van terá rota normal ou devo deixar as chamadas pausadas?`,
  (feriadoNome, data) => `📅 Confirmação de agenda: *${data}* aparece como *${feriadoNome}*.\n\nResponda se devo manter a operação ou pausar as enquetes desse dia.`,
  (feriadoNome, data) => `📅 Vi um feriado cadastrado em *${data}*: *${feriadoNome}*.\n\nQuer que eu envie as chamadas normalmente ou pause esse dia?`
];

const trackingArriving = [
  (nome) => `🚐 *${nome}*, a van está bem perto do seu ponto. Pode se preparar para embarcar.`,
  (nome) => `📍 Aviso para *${nome}*: o motorista está chegando ao seu endereço.`,
  (nome) => `🚐 *${nome}*, a van está a poucos minutos. Fique pronto(a) no ponto combinado.`,
  (nome) => `📍 *${nome}*, chegada próxima. Aguarde no local de embarque.`,
  (nome) => `🚐 *${nome}*, o motorista já está próximo do seu ponto de embarque.`,
  (nome) => `📍 Aviso para *${nome}*: a van está chegando. Aguarde no local combinado.`,
  (nome) => `🚐 *${nome}*, a van está perto do endereço cadastrado. Pode se preparar.`
];

const trackingNearby = [
  (nome) => `🚐 *${nome}*, a van já está na sua região. Comece a se preparar para o embarque.`,
  (nome) => `📍 Aviso para *${nome}*: o motorista está se aproximando do seu bairro.`,
  (nome) => `🚐 *${nome}*, a rota já está perto do seu ponto. Fique atento(a).`,
  (nome) => `📍 *${nome}*, a van está a caminho do seu endereço. Prepare-se com calma.`,
  (nome) => `🚐 *${nome}*, o trajeto já está avançando para sua região.`,
  (nome) => `📍 Aviso para *${nome}*: a van está se aproximando. Pode começar a se organizar.`,
  (nome) => `🚐 *${nome}*, o motorista está vindo para o seu ponto. Fique atento(a) ao próximo aviso.`
];

const trackingRequestLocation = [
  () => `📍 Agora compartilhe sua localização em tempo real por 2 horas para eu acompanhar a rota e avisar os passageiros.`,
  () => `📍 Compartilhe a localização em tempo real por 2 horas. Assim eu acompanho a rota e envio os avisos automaticamente.`,
  () => `📍 Para ativar os avisos de chegada, envie sua localização em tempo real por 2 horas pelo WhatsApp.`,
  () => `📍 Envie sua localização em tempo real por 2 horas para eu acompanhar o trajeto e avisar quem está na rota.`,
  () => `📍 Quando puder, compartilhe a localização em tempo real por 2 horas. Com isso, consigo mandar os avisos de aproximação.`,
  () => `📍 Para acompanhar a rota, preciso da sua localização em tempo real por 2 horas neste chat.`
];

const trackingRouteFinished = [
  (trecho, qtd) => `✅ Rota de ${upper(trecho)} finalizada. ${qtd} passageiro(s) recolhido(s) com sucesso.`,
  (trecho, qtd) => `✅ ${upper(trecho)} concluída. ${qtd} aluno(s) embarcado(s).`,
  (trecho, qtd) => `✅ Trecho ${upper(trecho)} encerrado. Total confirmado no trajeto: ${qtd}.`,
  (trecho, qtd) => `✅ Rota de ${upper(trecho)} concluída. Passageiros atendidos: ${qtd}.`,
  (trecho, qtd) => `✅ ${upper(trecho)} finalizada com ${qtd} passageiro(s) no trajeto.`,
  (trecho, qtd) => `✅ Trecho ${upper(trecho)} finalizado. Total da rota: ${qtd} aluno(s).`
];

const trackingRadiusChanged = [
  (km) => `📏 Raio de notificação atualizado para *${km}km*. Vou avisar os alunos quando a van estiver nessa distância.`,
  (km) => `📏 Feito! O aviso de chegada será enviado quando faltar aproximadamente *${km}km*.`,
  (km) => `📏 Novo raio salvo: *${km}km*. As notificações seguem essa distância a partir de agora.`,
  (km) => `📏 Tudo certo! O alerta de aproximação agora usa o raio de *${km}km*.`,
  (km) => `📏 Raio configurado para *${km}km*. Vou considerar essa distância nos próximos avisos.`,
  (km) => `📏 Combinado! Os avisos de chegada serão disparados perto de *${km}km* do ponto.`
];

const trackingSchoolArrival = [
  (escolaNome) => `🏫 A van está chegando na ${escolaNome}. Quem confirmou volta já pode se dirigir ao ponto combinado.`,
  (escolaNome) => `🏫 Aviso de chegada: a van está se aproximando da ${escolaNome}. Passageiros da volta, preparem-se.`,
  (escolaNome) => `🏫 A rota chegou perto da ${escolaNome}. Quem vai voltar de van deve aguardar no local de embarque.`,
  (escolaNome) => `🏫 A van está próxima da ${escolaNome}. Alunos da volta, sigam para o ponto combinado.`,
  (escolaNome) => `🏫 Chegada na escola em andamento: ${escolaNome}. Quem confirmou volta pode se preparar.`,
  (escolaNome) => `🏫 Aviso para a volta: o motorista está chegando na ${escolaNome}. Aguarde no local combinado.`
];

const askCapacityMessages = [
  (nome) => `👋 Muito prazer, ${nome}!\n\nPara configurar sua van, me diga: *qual é a capacidade de passageiros por turno?*\nExemplo: "15 de manhã e 12 à tarde".`,
  (nome) => `🚌 Bem-vindo, ${nome}.\n\nQuantos lugares sua van tem em cada turno? Pode responder por texto ou áudio.`,
  (nome) => `👥 ${nome}, para montar seu perfil preciso da lotação da van.\n\nInforme a capacidade por turno. Exemplo: "20 de manhã, 15 à tarde".`,
  (nome) => `🚌 Olá, ${nome}! Tudo bem?\n\nPara seguir com a configuração, me diga quantos passageiros cabem na van em cada turno.`,
  (nome) => `👥 ${nome}, vamos configurar a capacidade da van.\n\nPode responder com os números por turno. Exemplo: "18 manhã, 14 tarde".`,
  (nome) => `✅ Perfeito, ${nome}.\n\nAgora preciso saber a capacidade por turno da sua van. Pode mandar em uma frase simples.`
];

const askGarageMessages = [
  () => `🏠 Anotado! Agora me envie o endereço da sua garagem ou base de saída.\n\nExemplo: Rua das Flores, 123, Bairro.`,
  () => `🏠 Capacidade registrada.\n\nQual é o endereço de onde a van costuma sair para iniciar a rota?`,
  () => `🏠 Perfeito! Agora preciso do ponto inicial da rota: endereço da garagem, casa ou base da van.`,
  () => `🏠 Tudo certo! Me envie agora o endereço completo da base de saída da van.`,
  () => `🏠 Capacidade salva.\n\nQual endereço devo usar como início da rota? Pode ser garagem, casa ou ponto fixo.`,
  () => `🏠 Agora preciso da base da van.\n\nMande o endereço completo de onde o motorista costuma sair.`
];

const askSchoolMessages = [
  () => `🏫 Base salva.\n\nAgora me envie o endereço da escola ou destino principal dos alunos.`,
  () => `🏫 Garagem registrada.\n\nQual é a escola ou instituição principal atendida pela van? Pode mandar nome e cidade ou endereço completo.`,
  () => `🏫 Falta o destino principal.\n\nMe diga o nome ou endereço da escola/faculdade para onde a maioria dos alunos vai.`,
  () => `🏫 Tudo pronto com a base.\n\nAgora informe a escola ou destino principal da rota.`,
  () => `🏫 Base registrada.\n\nQual endereço devo usar como destino principal dos alunos?`,
  () => `🏫 Para finalizar essa etapa, mande o nome da escola ou o endereço completo do destino principal.`
];

const errCapacityMessages = [
  () => `⚠️ Não consegui identificar a capacidade da van. Pode mandar só os números por turno? Exemplo: "15 de manhã e 10 à tarde".`,
  () => `⚠️ Preciso da lotação em números para continuar. Exemplo: "20 lugares de manhã, 12 à tarde".`,
  () => `⚠️ Não ficou claro quantas vagas a van tem. Me envie a capacidade por turno, por favor.`,
  () => `⚠️ Ainda preciso da capacidade em número. Pode mandar algo como "16 manhã e 14 tarde".`,
  () => `⚠️ Não entendi a lotação informada. Responda com a quantidade de passageiros por turno.`,
  () => `⚠️ Para continuar, preciso saber quantas vagas existem em cada turno da van.`
];

const errAddressMessages = [
  (tipo) => `📍 Não encontrei o endereço da ${tipo} no mapa. Envie um endereço completo com rua, número, bairro e cidade.`,
  (tipo) => `📍 Não consegui localizar a ${tipo}. Pode mandar com mais detalhes? Exemplo: rua, número, bairro e cidade.`,
  (tipo) => `📍 O mapa não validou esse endereço da ${tipo}. Tente enviar o endereço completo, por favor.`,
  (tipo) => `📍 Não consegui confirmar a localização da ${tipo}. Envie o endereço completo com cidade, por favor.`,
  (tipo) => `📍 Esse endereço da ${tipo} ficou incompleto para o mapa. Pode reenviar com rua, número, bairro e cidade?`,
  (tipo) => `📍 Preciso de mais detalhes para localizar a ${tipo}. Mande o endereço completo por aqui.`
];

const salesPitchMessages = [
  (valor) => `🚌 Olá! Sou o VANBORA, assistente de IA para transporte escolar.\n\nEu ajudo sua van com:\n- Enquetes automáticas de presença\n- Rotas organizadas por turno\n- Avisos de chegada com localização\n- Controle de mensalidades e comprovantes\n\nPlano: *R$ ${money(valor)}/mês*.\n\nResponda *QUERO ASSINAR* para começar.`,
  (valor) => `🚐 Oi! O VANBORA organiza a rotina da sua van escolar.\n\nCom ele você acompanha presença, rotas, avisos aos passageiros e financeiro em um painel simples.\n\nValor mensal: *R$ ${money(valor)}*.\n\nPara ativar, mande *QUERO ASSINAR*.`,
  (valor) => `📋 Quer automatizar a chamada da van e reduzir mensagens manuais?\n\nO VANBORA envia enquetes, monta rotas, pede localização em tempo real e ajuda no financeiro.\n\nAssinatura: *R$ ${money(valor)}/mês*.\n\nDigite *QUERO ASSINAR* para seguir.`,
  (valor) => `🚌 Olá! O VANBORA ajuda motoristas de transporte escolar a organizar presença, rotas, avisos de chegada e mensalidades.\n\nPlano mensal: *R$ ${money(valor)}*.\n\nPara começar, responda *QUERO ASSINAR*.`,
  (valor) => `🚐 Com o VANBORA, sua van ganha enquetes automáticas, rotas por turno, acompanhamento com localização em tempo real e controle financeiro.\n\nValor: *R$ ${money(valor)}/mês*.\n\nSe quiser ativar, mande *QUERO ASSINAR*.`,
  (valor) => `📲 Oi! Eu organizo a operação da van pelo WhatsApp e pelo painel: chamadas, rotas, avisos aos passageiros e pagamentos.\n\nPlano: *R$ ${money(valor)}/mês*.\n\nResponda *QUERO ASSINAR* para ativar.`
];

const salesPaymentMessages = [
  (valor, tipo, chave) => `💳 Excelente. Para ativar seu acesso, faça o pagamento da primeira mensalidade:\n\nValor: *R$ ${money(valor)}*\nChave Pix (${tipo}): *${chave}*\n\nDepois envie a foto ou PDF do comprovante por aqui. Eu valido e sigo com sua configuração.`,
  (valor, tipo, chave) => `💳 Vamos ativar sua conta.\n\nPagamento inicial: *R$ ${money(valor)}*\nPix (${tipo}): *${chave}*\n\nAssim que concluir, mande o comprovante neste chat para validação.`,
  (valor, tipo, chave) => `💳 Para liberar o VANBORA, realize o Pix abaixo:\n\nValor: *R$ ${money(valor)}*\nChave (${tipo}): *${chave}*\n\nEnvie o comprovante aqui no chat. Após a validação, eu inicio seu cadastro.`,
  (valor, tipo, chave) => `💳 Perfeito. Para seguir, faça o Pix da primeira mensalidade:\n\nValor: *R$ ${money(valor)}*\nChave Pix (${tipo}): *${chave}*\n\nQuando puder, envie o comprovante do Pix por aqui.`,
  (valor, tipo, chave) => `💳 Dados para pagamento:\n\nValor: *R$ ${money(valor)}*\nPix (${tipo}): *${chave}*\n\nDepois do pagamento, mande o comprovante neste chat para eu validar.`,
  (valor, tipo, chave) => `💳 Para ativar sua assinatura, use o Pix abaixo:\n\nValor: *R$ ${money(valor)}*\nChave (${tipo}): *${chave}*\n\nAssim que pagar, envie a foto ou PDF do comprovante por aqui.`
];

const salesSuccessMessages = [
  () => `✅ Pagamento confirmado!\n\nSua assinatura está ativa. Agora vou fazer algumas perguntas rápidas para configurar sua van.\n\nPara começar: *qual é o seu nome completo ou nome da van?*`,
  () => `✅ Comprovante validado com sucesso.\n\nVamos concluir seu perfil para liberar o painel e as automações.\n\nPrimeira pergunta: *como devo chamar você ou sua van?*`,
  () => `✅ Deu certo, pagamento aprovado.\n\nAgora preciso configurar seus dados de operação.\n\nQual é o seu nome completo ou nome comercial da van?`,
  () => `✅ Pagamento registrado com sucesso.\n\nSua conta está liberada. Vou coletar alguns dados para configurar sua operação.\n\nQual nome devo usar para você ou para a van?`,
  () => `✅ Comprovante aprovado.\n\nAgora vamos finalizar o cadastro da van e preparar o painel.\n\nMe diga seu nome completo ou nome da van.`,
  () => `✅ Tudo certo, pagamento confirmado.\n\nVou começar o cadastro para liberar as rotas, enquetes e painel.\n\nComo devo identificar você ou sua van?`
];

const salesErrorMessages = [
  (valorEsperado) => `⚠️ Não consegui validar esse comprovante. Verifique se a imagem está nítida e se o valor é *R$ ${money(valorEsperado)}*. Depois envie novamente.`,
  (valorEsperado) => `⚠️ A leitura do comprovante não confirmou o pagamento. Confira se o valor pago foi *R$ ${money(valorEsperado)}* e mande outro print ou PDF.`,
  (valorEsperado) => `⚠️ Esse comprovante ficou pendente de validação. Envie uma imagem mais clara ou um PDF com o valor de *R$ ${money(valorEsperado)}*.`,
  (valorEsperado) => `⚠️ Não foi possível confirmar o pagamento por esse comprovante. O valor esperado é *R$ ${money(valorEsperado)}*. Pode enviar novamente?`,
  (valorEsperado) => `⚠️ O comprovante não bateu com a mensalidade de *R$ ${money(valorEsperado)}*.\n\nEnvie uma nova imagem ou PDF para eu tentar validar de novo.`,
  (valorEsperado) => `⚠️ A validação automática não conseguiu aprovar esse comprovante.\n\nConfira se aparece o valor de *R$ ${money(valorEsperado)}* e mande novamente.`
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
