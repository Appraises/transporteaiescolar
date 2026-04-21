// server/utils/MessageVariation.js
// Dicionário Sintático de Mensagens Anti-Ban (Imitação do rcwpapaoleo)

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Lembretes de Vencimento de Fatura (Robô Financeiro) ─────────────

const billingReminders = [
    (name, valor) => `Olá, *${name}*! Tudo bem? ✌️\n\nPassando só pra dar aquele toque que o vencimento da van chegou!\nO valor da sua mensalidade tá em *R$ ${valor.toFixed(2)}*.\n\nQuando puder, manda a foto ou PDF do comprovante do PIX aqui que o sistema já dá baixa automática na nossa prancheta! Valeu, tamo junto! 🚐`,
    (name, valor) => `Bom dia, *${name}*! Tudo joia? 🚗\n\nVimos aqui no roteiro que hoje fechou seu ciclo da van escolar.\nTotal da mensalidade: *R$ ${valor.toFixed(2)}*.\n\nManda a foto do Pix aqui no chat mesmo que nosso robozinho lê e confirma pra nós. Grande abraço! `,
    (name, valor) => `E aí, *${name}*! Tranquilo?\n\nChegou a data da renovação da van! 🚐\nO seu valor tabelado é de *R$ ${valor.toFixed(2)}*.\n\nPode mandar o comprovante por aqui que já registro no painel pra não ficarmos te cobrando depois. Obrigado desde já! 👊`,
    (name, valor) => `Oi, *${name}*! Passando rapidinho! 🚗\n\nSó pra avisar do fechamento da nossa mensalidade, que tá no valor de *R$ ${valor.toFixed(2)}*.\n\nFico no aguardo do comprovante do Pix. Pode mandar direto aqui. Bons estudos! 📚`,
    (name, valor) => `Salve, *${name}*!\n\nAviso automático do nosso controle de Van: Seu pagamento está programado pra hoje!\nO valor no sistema está registrado como *R$ ${valor.toFixed(2)}*.\n\nMe envia a imagem do Pix a qualquer hora pra nós zerarmos sua fatura. Valeu demais! 🚐💨`,
    (name, valor) => `Fala, *${name}*! Beleza? 😊\n\nAqui é o assistente da van passando pra lembrar da mensalidade!\nValor: *R$ ${valor.toFixed(2)}*.\n\nÉ só tirar um print do Pix e mandar aqui mesmo que nosso sistema confere na hora. Tmj! 🤙`,
    (name, valor) => `Opa, *${name}*! Tudo certo por aí? 🚐\n\nSeu boleto da van vence hoje! O valor cadastrado é *R$ ${valor.toFixed(2)}*.\n\nManda o comprovante do Pix aqui no privado que a gente já registra pra você. Valeu! 📲`,
    (name, valor) => `Hey, *${name}*! 👋\n\nLembrete amigável: a mensalidade da van tá no valor de *R$ ${valor.toFixed(2)}*.\n\nQuando fizer o Pix, manda a foto do comprovante aqui que o robozinho já dá baixa! Bora estudar! 📖✨`
];

// ─── Respostas I.A. Multimodal de Recebimento ────────────────────────

const receiptApprovals = [
    (name) => `✅ Show de bola, ${name}! Nossa I.A leu seu comprovante e o valor bateu certinho.\n\nSua mensalidade tá carimbada como PAGA. Valeu pela força! 🚐`,
    (name) => `✅ Maravilha, ${name}! Recebemos o PIX e a inteligência do bot já liquidou sua parcela do mês.\n\nTamo junto, até a próxima viagem! 🚗💨`,
    (name) => `✅ Boa, ${name}! Documento verificado com sucesso!\n\nDei baixa na sua prancheta digital aqui no sistema. Obrigado pela agilidade! 📚`,
    (name) => `✅ Tudo certo, ${name}! O comprovante que você mandou foi lido e processado.\n\nMensalidade zerada. Manda ver nos estudos! ✌️`,
    (name) => `✅ Perfeito, ${name}! O robô conferiu o PIX e tá tudo batendo! Pagamento registrado com sucesso.\n\nPode ficar tranquilo(a), tá tudo em dia! 🎉`,
    (name) => `✅ Recebido e aprovado, ${name}! Seu comprovante passou na verificação automática.\n\nMensalidade quitada! Nos vemos na van! 🚐💫`,
    (name) => `✅ Massa, ${name}! Comprovante lido, valor conferido, pagamento registrado!\n\nTá tudo certinho no sistema. Valeu demais! 🙌`
];

const receiptFailures = [
    (name) => `⏳ Opa, ${name}. Deu um tilt aqui: meu leitor automático não conseguiu confirmar o valor desse comprovante ou achou a imagem meio embaçada.\n\nEu reenviei isso lá pro Motorista fazer a baixa *manualmente*, beleza? Pode ficar sossegado(a). 🚐`,
    (name) => `🤔 ${name}, o robô não sacou muito bem as letras ou o valor desse PIX que você enviou. Mas sem crise!\n\nJoguei isso na tela do Chefe pra ele dar o aval a mão quando parar de dirigir. 👍`,
    (name) => `⚠️ Opa, não consegui ler esse comprovante automaticamente, ${name}.\nMas não se preocupa, mandei pro painel do motorista, ele vai confirmar isso pra você em algumas horinhas! 🚗`,
    (name) => `😅 ${name}, a imagem ficou meio difícil de ler aqui. Mas relaxa!\n\nJá encaminhei pro motorista verificar manualmente. Assim que ele confirmar, você recebe o aviso! 📋`,
    (name) => `🔍 ${name}, não rolou a leitura automática desse comprovante. A imagem pode estar cortada ou com pouca luz.\n\nMandei direto pro motorista dar uma olhada. Fique tranquilo(a)! ✅`
];

// ─── Falas da Enquete de Presença (Fase 5) ────────────────────────

const pollAnnouncements = [
    (turno) => `🚐 *Lista da Van (${turno})* - Quem vai embarcar hoje?`,
    (turno) => `📋 *Chamada do Turno ${turno}* - Marque abaixo!`,
    (turno) => `🚗 *Van do Turno (${turno})* - Presenças de Fato hoje:`,
    (turno) => `⏰ *Enquete do Motorista (${turno})* - Só marca se for:`,
    (turno) => `🎒 *Turno ${turno} - Chamada da Van!* Quem embarca hoje?`,
    (turno) => `📢 *Atenção Turno ${turno}!* Marca aí quem vai de van hoje:`,
    (turno) => `🚐💨 *Van ${turno}* - Bora confirmar presença galera!`
];

// ─── Rotas Ótimas Geradas (Ida/Volta) ────────────────────────

const routeIdaMessages = [
    (turno, qtd, listaPassageiros) => `📌 *Rota de IDA - ${turno.toUpperCase()}*\n👥 ${qtd} aluno(s) confirmado(s)\n\n1. 🏠 Base (sua garagem)\n${listaPassageiros}\n🏫 Destino Final`,
    (turno, qtd, listaPassageiros) => `🚐 *Roteiro IDA (${turno.toUpperCase()})*\n🎯 ${qtd} passageiro(s) na lista\n\n1. 🏠 Saída (Garagem)\n${listaPassageiros}\n🏫 Escola`,
    (turno, qtd, listaPassageiros) => `🗺️ *Caminho de IDA - Turno ${turno.toUpperCase()}*\n✅ ${qtd} confirmação(ões)\n\n1. 🏠 Partida (Base)\n${listaPassageiros}\n🏫 Chegada na Escola`,
    (turno, qtd, listaPassageiros) => `🛣️ *Trajeto IDA (${turno.toUpperCase()})*\n📊 ${qtd} na rota de hoje\n\n1. 🏠 Garagem (Ponto Inicial)\n${listaPassageiros}\n🏫 Escola (Destino)`,
    (turno, qtd, listaPassageiros) => `🚐 *IDA - ${turno.toUpperCase()}*\n👥 ${qtd} confirmado(s) pra hoje\n\n1. 🏠 Base\n${listaPassageiros}\n🏫 Chegada`
];

const routeVoltaMessages = [
    (turno, qtd, listaPassageiros) => `📌 *Rota de VOLTA - ${turno.toUpperCase()}*\n👥 ${qtd} aluno(s) confirmado(s)\n\n1. 🏫 Escola (Ponto de Partida)\n${listaPassageiros}\n🏠 Retorno (Base)`,
    (turno, qtd, listaPassageiros) => `🚐 *Roteiro VOLTA (${turno.toUpperCase()})*\n🎯 ${qtd} passageiro(s) na lista\n\n1. 🏫 Saída da Escola\n${listaPassageiros}\n🏠 Retorno à Garagem`,
    (turno, qtd, listaPassageiros) => `🗺️ *Caminho de VOLTA - Turno ${turno.toUpperCase()}*\n✅ ${qtd} confirmação(ões)\n\n1. 🏫 Partida (Escola)\n${listaPassageiros}\n🏠 Chegada na Base`,
    (turno, qtd, listaPassageiros) => `🛣️ *Trajeto VOLTA (${turno.toUpperCase()})*\n📊 ${qtd} na rota de hoje\n\n1. 🏫 Escola (Embarque)\n${listaPassageiros}\n🏠 Garagem (Destino Final)`,
    (turno, qtd, listaPassageiros) => `🚐 *VOLTA - ${turno.toUpperCase()}*\n👥 ${qtd} confirmado(s) pra hoje\n\n1. 🏫 Escola\n${listaPassageiros}\n🏠 Base`
];

const routeEmptyMessages = [
    (turno) => `📢 *${turno.toUpperCase()}:* Nenhum passageiro confirmou presença na enquete de hoje. Turno livre! 🎉`,
    (turno) => `🚫 *Turno ${turno.toUpperCase()}:* Ninguém marcou presença hoje. Pode descansar, chefe! ☕`,
    (turno) => `📋 *${turno.toUpperCase()}:* Sem confirmações de passageiros por hoje. A van fica na garagem! 🅿️`,
    (turno) => `🏖️ *${turno.toUpperCase()}:* Zero confirmações na enquete de hoje. Aproveita o turno livre!`,
    (turno) => `😴 *${turno.toUpperCase()}:* Galera não confirmou hoje. Van no descanso! Bom turno livre, chefe!`
];

// ─── Lançamento de Custos e Relatórios ────────────────────────

const expenseConfirmations = [
    (categoria, valor, totalMes) => `✅ Anotado, chefe! Registrei *R$ ${valor.toFixed(2)}* em ${categoria}.\nAté agora, as despesas desse mês estão em *R$ ${totalMes.toFixed(2)}*. 🚐`,
    (categoria, valor, totalMes) => `📝 Custo salvo no sistema! Mais *R$ ${valor.toFixed(2)}* pra conta de ${categoria}.\nSeu custo total do mês foi pra *R$ ${totalMes.toFixed(2)}*. 🔧`,
    (categoria, valor, totalMes) => `Ok! Gasto de *R$ ${valor.toFixed(2)}* com ${categoria} cadastrado.\nTotal de saídas no mês: *R$ ${totalMes.toFixed(2)}*. 💸`,
    (categoria, valor, totalMes) => `💰 Registrado! *R$ ${valor.toFixed(2)}* em ${categoria} anotado na prancheta.\nDespesas acumuladas: *R$ ${totalMes.toFixed(2)}*. Controle é tudo! 📊`,
    (categoria, valor, totalMes) => `✅ Beleza, chefe! Despesa com ${categoria} no valor de *R$ ${valor.toFixed(2)}* lançada.\nResumo do mês: *R$ ${totalMes.toFixed(2)}* em gastos até agora. 🚐`
];

const profitReports = [
    (nome, mes, receita, despesas, lucro) => `Olá, *${nome}*! 📊\n\nAqui é o seu robô financeiro com o fechamento do mês de *${mes}*:\n\n💰 *Receita (mensalidades pagas):* R$ ${receita.toFixed(2)}\n📉 *Despesas e Custos:* R$ ${despesas.toFixed(2)}\n─────────────────\n✅ *Lucro líquido:* R$ ${lucro.toFixed(2)}\n\nBora pra mais um mês de sucesso! 🚐💨`,
    (nome, mes, receita, despesas, lucro) => `Fala, *${nome}*! Tudo pronto para o balanço de *${mes}*? 📉📈\n\nNeste mês você arrecadou *R$ ${receita.toFixed(2)}* dos alunos, e gastou *R$ ${despesas.toFixed(2)}* com a van.\nSeu lucro final ficou em *R$ ${lucro.toFixed(2)}*!\n\nSe precisar ver os detalhes, acesse o painel. Um abraço! 💼`,
    (nome, mes, receita, despesas, lucro) => `*${nome}*, fechamento de *${mes}* pronto! 🗓️\n\n📥 Entradas: R$ ${receita.toFixed(2)}\n📤 Saídas: R$ ${despesas.toFixed(2)}\n━━━━━━━━━━━━━━\n${lucro >= 0 ? '🟢' : '🔴'} Resultado: R$ ${lucro.toFixed(2)}\n\nBom mês, chefe! Continue assim! 💪`,
    (nome, mes, receita, despesas, lucro) => `E aí, *${nome}*! O relatório de *${mes}* saiu do forno! 🔥\n\n💵 Mensalidades recebidas: R$ ${receita.toFixed(2)}\n🔧 Gastos totais: R$ ${despesas.toFixed(2)}\n─────────────────\n💰 No bolso: R$ ${lucro.toFixed(2)}\n\nTá no caminho certo! 🚐📈`
];

// ─── Endereços e Onboarding ────────────────────────

const addressConfirmations = [
    (qtd) => `✅ *Tudo pronto!* Cadastrei ${qtd} endereço(s) no sistema.\n\nPara trocar o endereço do dia, é só me mandar uma mensagem como:\n_"trocar endereço ida para Casa do Pai"_`,
    (qtd) => `📍 *${qtd} endereço(s) salvo(s) com sucesso!*\n\nSe precisar mudar o local de embarque/desembarque, me manda:\n_"trocar endereço volta para Casa da Avó"_`,
    (qtd) => `✅ Pronto! *${qtd} endereço(s)* registrado(s) no sistema da van.\n\nQuer trocar o ponto de ida ou volta? É só mandar algo como:\n_"quero embarcar na Casa do Pai"_`
];

const addressSwitches = [
    (trecho, apelido) => `✅ Endereço da *${trecho}* trocado para *${apelido}*!\n\n⚠️ _Esse endereço ficará ativo até que você peça pra trocar de novo._`,
    (trecho, apelido) => `Feito! Anotei aqui que a *${trecho}* agora vai ser em: *${apelido}*. 🚐\n\n_Lembre-se: ele continuará ativo até você mudar novamente!_`,
    (trecho, apelido) => `📍 Trocado! Sua *${trecho}* agora é no endereço: *${apelido}*.\n\n_Pode trocar de novo quando quiser, é só me avisar!_ ✌️`,
    (trecho, apelido) => `🔄 Endereço da *${trecho}* atualizado para *${apelido}*!\n\n_Fica ativo até você pedir outra troca. Bons estudos!_ 📚`
];

const addressReminders = [
    (nome, primario, apelidoIda, apelidoVolta) => {
        let detalhe = '';
        if (apelidoIda && apelidoVolta) {
            detalhe = `a *ida* está em *${apelidoIda}* e a *volta* em *${apelidoVolta}*`;
        } else if (apelidoIda) {
            detalhe = `a *ida* está em *${apelidoIda}* (volta no endereço padrão)`;
        } else {
            detalhe = `a *volta* está em *${apelidoVolta}* (ida no endereço padrão)`;
        }
        return `🔔 Bom dia, *${nome}*!\n\nSó passando pra lembrar: seu endereço ativo *não* é o principal (*${primario}*).\nAtualmente, ${detalhe}.\n\nSe quiser voltar pro padrão, me mande:\n_"trocar endereço para ${primario}"_`;
    },
    (nome, primario, apelidoIda, apelidoVolta) => {
        let detalhe = '';
        if (apelidoIda && apelidoVolta) {
            detalhe = `ida em *${apelidoIda}* e volta em *${apelidoVolta}*`;
        } else if (apelidoIda) {
            detalhe = `ida em *${apelidoIda}*`;
        } else {
            detalhe = `volta em *${apelidoVolta}*`;
        }
        return `⚠️ Ei, *${nome}*! Lembrete rápido:\n\nVocê tá com endereço alternativo ativo: ${detalhe}.\nSeu endereço padrão é *${primario}*.\n\nPra voltar ao normal, manda: _"voltar pro endereço padrão"_ 🏠`;
    }
];

// ─── Férias e Feriados (Pausas) ────────────────────────

const pauseConfirmations = [
    (tipo, dataFim) => `✅ Entendido! Suspenderei todas as enquetes e chamadas de rota. Motivo: *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'} Bom descanso! 🏖️`,
    (tipo, dataFim) => `Tudo certo, chefe! O sistema ficará em silêncio por conta de *${tipo}*${dataFim ? ` até o dia *${dataFim}*.` : '.'} Até a volta! 🚐💤`,
    (tipo, dataFim) => `🔇 Sistema pausado! Motivo: *${tipo}*${dataFim ? `. Volto a rodar dia *${dataFim}*.` : '.'}\n\nAproveita o descanso, chefe! Quando voltar, é só me avisar. 😎`,
    (tipo, dataFim) => `👍 Anotado! Pausando tudo por conta de *${tipo}*${dataFim ? ` até *${dataFim}*.` : '.'}\n\nNenhuma enquete ou rota será gerada nesse período. Boas férias! 🌴`
];

const pauseResumptions = [
    () => `🎒 Bem-vindo de volta! As enquetes diárias e o cálculo de rotas acabam de voltar à programação normal. Bora rodar! 🚐💨`,
    () => `Beleza! O recesso acabou. As chamadas automáticas dos alunos estão reativadas a partir de agora. Vamo que vamo! 🛣️`,
    () => `🚐 Voltamos ao ar! Enquetes, rotas e cobranças estão ativas novamente. Bora trabalhar, chefe! 💪`,
    () => `✅ Sistema reativado! As enquetes diárias voltam amanhã de manhã. Bem-vindo de volta! 🎉`
];

const proactiveHolidays = [
    (feriadoNome, data) => `Fala, chefe! Meu calendário acusou aqui que dia *${data}* é o feriado nacional de *${feriadoNome}*.\n\nVocê vai rodar a van nesse dia ou posso pausar as enquetes dessa data? (Responda "vou rodar" ou "é feriado") 📅`,
    (feriadoNome, data) => `Opa! Dia *${data}* tá marcado como feriado de *${feriadoNome}*.\n\nQuer que eu suspenda a chamada para os alunos nesse dia? Me confirma por favor! (Mande "sim, pausa" ou "não, roda normal") 🚨`,
    (feriadoNome, data) => `📅 Chefe, achei aqui no calendário: *${data}* é *${feriadoNome}*!\n\nVai ter van nesse dia ou suspendo tudo? Me diz! (Responda "roda normal" ou "pausa")`,
    (feriadoNome, data) => `🗓️ Ei, chefe! Dia *${data}* tá vindo aí e é *${feriadoNome}*.\n\nQuero saber: roda van ou folga pra todo mundo? Me avisa! 🚐`
];

// ─── Rastreamento GPS em Tempo Real ────────────────────────

const trackingArriving = [
    (nome) => `🚐 Atenção, *${nome}*! A van já tá pertinho! Fica pronto(a) que estamos chegando! 📍`,
    (nome) => `🚗 *${nome}*, a van está se aproximando! Já desce que é rapidinho! ⏰`,
    (nome) => `📍 Ô *${nome}*, a van tá quase aí! Se arruma que já já estamos na porta! 🚐💨`,
    (nome) => `⚡ *${nome}*! A van tá chegando na sua parada! Corre que é agora! 🏃‍♂️🚐`,
    (nome) => `🔔 *${nome}*, atenção! Poucos minutos pro motorista chegar aí. Desce que tá pertinho! 🚗`,
    (nome) => `🚐 Ei, *${nome}*! Já estamos quase na sua porta. Bora embarcar! 🎒`
];

const trackingNearby = [
    (nome) => `🔔 *${nome}*, a van já saiu e tá na sua região! Vai se preparando que logo chega na sua parada! 🚐`,
    (nome) => `📢 Fala, *${nome}*! A van já tá rodando pertinho. Se organiza que daqui a pouco chega aí! ✌️`,
    (nome) => `⏰ *${nome}*, ó o aviso: a van já tá por perto da sua área! Vai ficando de prontidão! 🚗`,
    (nome) => `🗺️ *${nome}*, a van tá se aproximando da sua região! Começa a se preparar! 🎒`,
    (nome) => `📍 Ei, *${nome}*! O motorista já tá rodando perto. Se arruma que logo ele chega! 🚐💨`,
    (nome) => `🔔 Opa, *${nome}*! A van entrou na sua área. Vai se organizando pra embarcar! ✅`
];

const trackingRequestLocation = [
    () => `📍 *Agora compartilhe sua localização em tempo real por 2 horas!*\n\nÉ só tocar no 📎 (clipe) → Localização → "Compartilhar localização em tempo real" → 2 horas.\n\nAssim eu aviso cada passageiro automaticamente quando você estiver chegando! 🚐`,
    () => `🗺️ *Pra eu rastrear sua rota, compartilhe a localização em tempo real (2h)!*\n\nVai no clipe 📎 → Localização → Tempo Real → 2 horas.\n\nDepois disso pode guardar o celular que eu cuido dos avisos! ✅`,
    () => `📡 *Ative o compartilhamento de localização em tempo real por 2 horas!*\n\nToque no 📎 → Localização → Compartilhar em Tempo Real → 2h.\n\nVou avisar cada aluno automaticamente quando a van estiver chegando! 🚐💨`,
    () => `🛰️ *Chefe, manda a localização em tempo real (2h) pra eu poder avisar a galera!*\n\nÉ rapidinho: clipe 📎 → Localização → Tempo Real → 2 horas.\n\nCom isso ativado, você não precisa avisar ninguém manualmente! 🤖`,
    () => `📍 *Compartilha a localização ao vivo por 2h que eu faço o resto!*\n\n📎 → Localização → Tempo Real → 2 horas.\n\nCada aluno vai receber o aviso certinho na hora que a van tiver chegando! 🚐✨`
];

const trackingRouteFinished = [
    (trecho, qtd) => `🏁 *Rota de ${trecho.toUpperCase()} finalizada!* Todos os ${qtd} passageiros foram recolhidos com sucesso! Bom trabalho, chefe! 🚐✅`,
    (trecho, qtd) => `✅ *${trecho.toUpperCase()} completa!* ${qtd} passageiro(s) embarcaram. Rota encerrada! Manda ver! 💪`,
    (trecho, qtd) => `🎯 *Rota de ${trecho.toUpperCase()} concluída!* ${qtd} aluno(s) a bordo. Missão cumprida! 🚐🏆`,
    (trecho, qtd) => `🏁 Acabou! *${trecho.toUpperCase()}* finalizada com ${qtd} passageiro(s). Excelente trabalho! 👏🚐`,
    (trecho, qtd) => `✅ *${trecho.toUpperCase()} encerrada!* Todos os ${qtd} aluno(s) embarcados. Pode seguir tranquilo, chefe! 🛣️`
];

const trackingRadiusChanged = [
    (km) => `✅ Raio de notificação ajustado para *${km}km*! Vou avisar os alunos quando você estiver a essa distância. 📍`,
    (km) => `📡 Beleza! Agora o aviso de "van chegando" vai disparar quando faltar *${km}km*. Anotado! ✅`,
    (km) => `🔧 Raio atualizado! Os alunos serão notificados quando a van estiver a *${km}km* de distância. 🚐`,
    (km) => `✅ Feito! Novo raio de aviso: *${km}km*. Os passageiros vão adorar saber a hora certa de descer! 📍`
];

const trackingSchoolArrival = [
    (escolaNome) => `🚐 *A van tá chegando na ${escolaNome}!* Quem vai voltar, já vai se encaminhando pro ponto de encontro! 🏫`,
    (escolaNome) => `📢 *Atenção galera!* A van já tá pertinho da ${escolaNome}! Quem marcou volta, pode ir descendo! ⏰`,
    (escolaNome) => `📍 *Aviso:* A van já está chegando na ${escolaNome}! Se você volta de van, já vai pro local de embarque! 🚗💨`,
    (escolaNome) => `🔔 *Galera da volta!* A van tá se aproximando da ${escolaNome}! Vai pro ponto de encontro! 🚐`,
    (escolaNome) => `🏫 *Van a caminho da ${escolaNome}!* Quem volta de van hoje, já pode ir se preparando! ⏰🚐`,
    (escolaNome) => `📢 Ei, turma! A van já tá quase na ${escolaNome}! Quem votou volta, bora pro ponto de embarque! 🎒`
];

// ─── Onboarding Gradual do Motorista ────────────────────────

const askCapacityMessages = [
    (nome) => `Muito prazer, ${nome}! Entendido.\n\nPara começarmos as configurações, **qual é a capacidade de passageiros da sua van?**\n(Ex: Levo 15 pessoas de manhã e 10 à tarde)`,
    (nome) => `Seja muito bem-vindo, ${nome}! Vamos lá.\n\nPode me dizer, em áudio ou texto: **quantos lugares tem a sua van em cada turno?**\n(Ex: 20 de manhã, 10 à tarde)`,
    (nome) => `Fechado, ${nome}! Prazerzão.\n\nPra eu já configurar seu painel com inteligência, **qual é a lotação máxima de alunos que você carrega?**`,
    (nome) => `E aí, ${nome}! É ótimo ter você no time. 👏\n\nMe fala uma coisa: **quantos passageiros a sua van comporta?** (Pode mandar em áudio, tipo "Levo 15 de manhã e 8 à tarde")`,
    (nome) => `Valeu, ${nome}! Tudo certo.\n\nAgora um detalhe importante: **qual a capacidade da sua van por turno?** Me manda os números aí pra eu registrar!`,
    (nome) => `Show, ${nome}! Vamos pro próximo passo.\n\nDiz aí, **quantas crianças a sua van carrega** em média na ida e na volta?`
];

const askGarageMessages = [
    () => `Anotado! Lotação já salva no sistema. ✅\n\nAgora me diz, **qual é o endereço da sua garagem** ou do lugar onde você estaciona e começa sua rota diariamente?\n(Ex: Rua das Flores, 123, Bairro)`,
    () => `Beleza! Capacidade registrada na nossa caderneta virtual. 🚐\n\nO próximo passo: **de onde você sai todo dia?** Manda o endereço da sua garagem pra eu usar de ponto de partida no Google Maps!`,
    () => `Entendido! Vagas computadas.\n\nQual é o **endereço da base (garagem)** de onde a sua van sempre despacha de manhãzinha?`,
    () => `Lotação configurada! 📋\n\nPra eu calcular as rotas, **de qual endereço você sempre parte?** Manda a rua e o número da sua garagem!`,
    () => `Feito! Anotei a lotação máxima. ☑️\n\nAgora, manda pra cá: **qual é o endereço da sua casa ou garagem**, de onde a van começa o trajeto? (Rua, Número, Bairro)`,
    () => `Beleza pura! Vagas registradas. 🚀\n\nPreciso de mais uma coisinha: **onde é o seu ponto inicial de partida?** (O endereço da sua base)`
];

const askSchoolMessages = [
    () => `Base salva nas coordenadas detectadas! 📍\n\nPor último, **qual é o endereço da principal escola ou universidade** que você dirige os alunos?\n(Pode dizer o nome e a cidade)`,
    () => `Garagem encontrada e salva no mapa! 🗺️\n\nO último detalhe pra fecharmos o ciclo: **qual o endereço da escola/faculdade** pra onde você faz o transporte?`,
    () => `Feito! Ponto de partida registrado. ✅\n\nAgora manda pra cá o **endereço do destino principal (escola)** da sua galera!`,
    () => `Mapa atualizado com a sua base! 📍\n\nPara encerrar: **qual é o destino final?** Manda o nome ou o endereço certinho da escola!`,
    () => `Local de partida confirmado! 🏠\n\nÚltima pergunta: **pra onde estamos indo?** Manda aí o nome ou endereço da escola/faculdade principal!`,
    () => `Tudo certo com a garagem! 👍\n\nPra gente finalizar o seu perfil, me fala: **qual é o endereço da escola ou instituição** pra qual a maioria da turma vai?`
];

const errCapacityMessages = [
    () => `🧐 Não entendi muito bem. Pode me dizer apenas os números da capacidade de alunos por turno? (Ex: 15 de manhã)`,
    () => `🤔 Fiquei confuso com os números. Tem como mandar em texto direto? (Ex: "20 na ida e 20 na volta")`,
    () => `⚠️ Oops, não captei a matemática. Manda só os totais de capacidade pra eu gravar aqui!`,
    () => `😅 Tive um pequeno branco aqui. Você pode reescrever a quantidade de vagas da van?`,
    () => `🤖 Minha inteligência falhou só um pouquinho agora. Pode me mandar no formato "15 de manhã e 10 à tarde"?`,
    () => `🤔 Não peguei o número exato, chefe. Me manda de novo a lotação da van?`
];

const errAddressMessages = [
    (tipo) => `⚠️ Não achei esse endereço da ${tipo} no mapa. Tenta mandar algo mais completo, por favor.`,
    (tipo) => `🤔 Meu GPS não conseguiu achar essa localização para a ${tipo}. Pode colocar Rua, Número e Bairro?`,
    (tipo) => `📍 Ops, o Google Maps não validou o endereço da ${tipo}. Tenta mandar mais focado no endereço físico mesmo!`,
    (tipo) => `🗺️ Eita, deu erro buscando a ${tipo}. Você consegue mandar o endereço completo com cidade, por favor?`,
    (tipo) => `⚠️ Meu robô de mapas se perdeu tentando achar a ${tipo}. Escreve a rua certinha e o bairro pra eu tentar de novo!`,
    (tipo) => `🧭 Não encontrei as coordenadas da ${tipo}! Tenta formular o endereço igual aparece em correspondência!`
];

// ─── Vendas (Botão do Pitch + Pagamento Lead) ────────────────────────

const salesPitchMessages = [
    (valor) => `👋 *Olá! Sou o assistente de IA para Van Escolar.* 🚐💨\n\nVocê sabia que pode automatizar toda a sua logística e ainda passar mais segurança para os pais?\n\n*O que eu faço por você:*\n✅ Enquetes automáticas de presença todo dia.\n✅ Rastreamento GPS em tempo real para os pais.\n✅ Gestão completa de mensalidades e recibos.\n✅ Notificações inteligentes de chegada na escola.\n\n🚀 *Quer profissionalizar sua van por apenas R$ ${valor.toFixed(2)}/mês?*\n\nResponda *QUERO ASSINAR* para receber as instruções de pagamento!`,
    (valor) => `🚐 Olá! Sou o robô inteligente feito para motoristas de Van Escolar!\n\nSeu trabalho pode ficar muito mais simples:\n☑️ Enquetes de ida e volta sem precisar mandar bom dia.\n☑️ Avisos aos passageiros quando a van estiver perto de casa.\n☑️ Organização financeira automática de boletos e despesas.\n\nTudo isso sai por apenas *R$ ${valor.toFixed(2)} por mês*!\n\nInteressado em modernizar sua rotina? Mande *QUERO ASSINAR* aqui no chat!`,
    (valor) => `Oi! Boas-vindas! 🤖👋 Eu sou a Inteligência Artificial das Vans Escolares.\n\nEu posso te ajudar com muitas coisas:\n- Saber quem vai embarcar antes de sair de casa (enquetes)\n- Mostrar o trajeto pelo GPS para evitar ligações indesejadas\n- Conferir recibos de Pix do pessoal automaticamente\n\nIsso tudo pelo valor mensal de apenas *R$ ${valor.toFixed(2)}*.\n\nTopa melhorar sua van? Digite *QUERO ASSINAR* para começarmos!`
];

const salesPaymentMessages = [
    (valor, tipo, chave) => `🎉 *Excelente escolha! Você está a um passo de modernizar sua van.*\n\nPara ativar o seu acesso, realize o pagamento da primeira mensalidade:\n\n💰 *Valor:* R$ ${valor.toFixed(2)}\n🔑 *Chave PIX (${tipo}):* ${chave}\n\n📸 Após realizar o pagamento, **mande a foto ou PDF do comprovante aqui mesmo**.\n\nNossa inteligência artificial vai validar o seu pagamento em segundos e já liberar o seu bot!`,
    (valor, tipo, chave) => `Vamos nessa! 🚀\n\nPara destravar todas as minhas funcionalidades pro seu painel, você só precisa fazer o PIX de adesão:\n\n💳 *Valor a pagar:* R$ ${valor.toFixed(2)}\n🔑 *Identificação PIX (${tipo}):* ${chave}\n\nManda a foto/print do comprovante por aqui assim que terminar!\nEu reconheço o pagamento sozinho e te dou acesso imediato.`,
    (valor, tipo, chave) => `Ótimo! Sua vida vai ficar muito mais fácil. 😎\n\nPor favor, faça o PIX do primeiro mês de uso:\n\n💵 *Mensalidade:* R$ ${valor.toFixed(2)}\n🔑 *Chave PIX (${tipo}):* ${chave}\n\nTerminou? Envia a imagem do seu comprovante direto nesse chat. Meu sistema de visão artificial já confere e ativa sua assinatura em poucos segundos!`
];

const salesSuccessMessages = [
    () => `✅ *PAGAMENTO CONFIRMADO!* 🎉\n\nParabéns! Sua assinatura está ativa.\nVamos fazer algumas perguntas rápidas para completarmos o seu perfil e sua configuração logística.\n\n*(DICA: Se achar mais fácil, você pode responder todas essas perguntas por áudio!)* 🎙️\n\nPara começarmos, **qual o seu nome completo (ou nome da sua Van)?**`,
    () => `✅ *DEU CERTO! SEU PIX FOI VALIDADO!* 🎉\n\nSua inscrição tá confirmadíssima!\nAgora precisamos ajeitar as coisas pra você começar a usar o robô na rua.\n\n_Pode responder todas essas minhas próximas perguntas enviando áudio no microfone se preferir!_ 🎙️\n\nPara a gente iniciar, **qual o seu nome completo ou como você é conhecido?**`,
    () => `✅ *COMPROVANTE VERIFICADO COM SUCESSO!* 🚀\n\nVocê agora é um assinante oficial! Próximo passo: montar o seu perfil.\n\n_(Nota: Se você for de poucas palavras, manda um áudio pra mim a partir de agora que eu entendo igual!)_ 🎙️\n\nPra eu saber com quem tô falando direitinho, **qual é o seu nome?**`
];

const salesErrorMessages = [
    (valorEsperado) => `⚠️ Hmmm, não consegui validar esse comprovante. Verifique se a foto está nítida e se o valor bate (R$ ${valorEsperado.toFixed(2)}). Tente mandar a imagem novamente!`,
    (valorEsperado) => `🧐 Tive um problema ao ler esse documento. O valor exato é R$ ${valorEsperado.toFixed(2)}. Veja se está tudo certo e mande o PDF ou print de novo!`,
    (valorEsperado) => `❌ Ops, meu leitor de comprovantes não confirmou esse Pix. Confirma pra mim se tá tudo certo com o valor de R$ ${valorEsperado.toFixed(2)} e joga a imagem aqui outra vez.`
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
