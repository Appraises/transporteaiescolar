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
    (name, valor) => `Salve, *${name}*!\n\nAviso automático do nosso controle de Van: Seu pagamento está programado pra hoje!\nO valor no sistema está registrado como *R$ ${valor.toFixed(2)}*.\n\nMe envia a imagem do Pix a qualquer hora pra nós zerarmos sua fatura. Valeu demais! 🚐💨`
];

// ─── Respostas I.A. Multimodal de Recebimento ────────────────────────

const receiptApprovals = [
    (name) => `✅ Show de bola, ${name}! Nossa I.A leu seu comprovante e o valor bateu certinho.\n\nSua mensalidade tá carimbada como PAGA. Valeu pela força! 🚐`,
    (name) => `✅ Maravilha, ${name}! Recebemos o PIX e a inteligência do bot já liquidou sua parcela do mês.\n\nTamo junto, até a próxima viagem! 🚗💨`,
    (name) => `✅ Boa, ${name}! Documento verificado com sucesso!\n\nDei baixa na sua prancheta digital aqui no sistema. Obrigado pela agilidade! 📚`,
    (name) => `✅ Tudo certo, ${name}! O comprovante que você mandou foi lido e processado.\n\nMensalidade zerada. Manda ver nos estudos! ✌️`
];

const receiptFailures = [
    (name) => `⏳ Opa, ${name}. Deu um tilt aqui: meu leitor automático não conseguiu confirmar o valor desse comprovante ou achou a imagem meio embaçada.\n\nEu reenviei isso lá pro Motorista fazer a baixa *manualmente*, beleza? Pode ficar sossegado(a). 🚐`,
    (name) => `🤔 ${name}, o robô não sacou muito bem as letras ou o valor desse PIX que você enviou. Mas sem crise!\n\nJoguei isso na tela do Chefe pra ele dar o aval a mão quando parar de dirigir. 👍`,
    (name) => `⚠️ Opa, não consegui ler esse comprovante automaticamente, ${name}.\nMas não se preocupa, mandei pro painel do motorista, ele vai confirmar isso pra você em algumas horinhas! 🚗`
];

// ─── Falas da Enquete de Presença (Fase 5) ────────────────────────

const pollAnnouncements = [
    (turno) => `🚐 *Lista da Van (${turno})* - Quem vai embarcar hoje?`,
    (turno) => `📋 *Chamada do Turno ${turno} *- Marque abaixo!`,
    (turno) => `🚗 *Van do Turno (${turno})* - Presenças de Fato hoje:`,
    (turno) => `⏰ *Enquete do Motorista (${turno}) *- Só marca se for:`
];

// ─── Lançamento de Custos e Relatórios ────────────────────────

const expenseConfirmations = [
    (categoria, valor, totalMes) => `✅ Anotado, chefe! Registrei *R$ ${valor.toFixed(2)}* em ${categoria}.\nAté agora, as despesas desse mês estão em *R$ ${totalMes.toFixed(2)}*. 🚐`,
    (categoria, valor, totalMes) => `📝 Custo salvo no sistema! Mais *R$ ${valor.toFixed(2)}* pra conta de ${categoria}.\nSeu custo total do mês foi pra *R$ ${totalMes.toFixed(2)}*. 🔧`,
    (categoria, valor, totalMes) => `Ok! Gasto de *R$ ${valor.toFixed(2)}* com ${categoria} cadastrado.\nTotal de saídas no mês: *R$ ${totalMes.toFixed(2)}*. 💸`
];

const profitReports = [
    (nome, mes, receita, despesas, lucro) => `Olá, *${nome}*! 📊\n\nAqui é o seu robô financeiro com o fechamento do mês de *${mes}*:\n\n💰 *Receita (mensalidades pagas):* R$ ${receita.toFixed(2)}\n📉 *Despesas e Custos:* R$ ${despesas.toFixed(2)}\n─────────────────\n✅ *Lucro líquido:* R$ ${lucro.toFixed(2)}\n\nBora pra mais um mês de sucesso! 🚐💨`,
    (nome, mes, receita, despesas, lucro) => `Fala, *${nome}*! Tudo pronto para o balanço de *${mes}*? 📉📈\n\nNeste mês você arrecadou *R$ ${receita.toFixed(2)}* dos alunos, e gastou *R$ ${despesas.toFixed(2)}* com a van.\nSeu lucro final ficou em *R$ ${lucro.toFixed(2)}*!\n\nSe precisar ver os detalhes, acesse o painel. Um abraço! 💼`
];

// ─── Endereços e Onboarding ────────────────────────

const addressConfirmations = [
    (qtd) => `✅ *Tudo pronto!* Cadastrei ${qtd} endereço(s) no sistema.\n\nPara trocar o endereço do dia, é só me mandar uma mensagem como:\n_"trocar endereço ida para Casa do Pai"_`
];

const addressSwitches = [
    (trecho, apelido) => `✅ Endereço da *${trecho}* trocado para *${apelido}*!\n\n⚠️ _Esse endereço ficará ativo até que você peça pra trocar de novo._`,
    (trecho, apelido) => `Feito! Anotei aqui que a *${trecho}* agora vai ser em: *${apelido}*. 🚐\n\n_Lembre-se: ele continuará ativo até você mudar novamente!_`
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
    }
];


module.exports = {
    pick,
    financeiro: {
        cobranca: (name, valor) => pick(billingReminders)(name, valor),
        sucesso: (name) => pick(receiptApprovals)(name),
        falha: (name) => pick(receiptFailures)(name)
    },
    logistica: {
        pollHeader: (turno) => pick(pollAnnouncements)(turno)
    },
    despesas: {
        confirmacao: (categoria, valor, totalMes) => pick(expenseConfirmations)(categoria, valor, totalMes),
        relatorio: (nome, mes, receita, despesas, lucro) => pick(profitReports)(nome, mes, receita, despesas, lucro)
    },
    enderecos: {
        confirmacao: (qtd) => pick(addressConfirmations)(qtd),
        troca: (trecho, apelido) => pick(addressSwitches)(trecho, apelido),
        lembreteAlternativo: (nome, primario, apelidoIda, apelidoVolta) => pick(addressReminders)(nome, primario, apelidoIda, apelidoVolta)
    }
};
