const axios = require('axios');

async function testarDespesa() {
    console.log("Simulando Motorista enviando mensagem de custo no WhatsApp...");

    // Payload simulando o formato da Evolution API
    const payload = {
        event: "messages.upsert",
        data: {
            key: {
                remoteJid: "5511999999999@s.whatsapp.net", // Telefone de um motorista mock
                fromMe: false
            },
            message: {
                conversation: "Gastei 250 conto de gasolina hoje"
            }
        }
    };

    try {
        const res = await axios.post('http://localhost:3000/webhook/evolution', payload);
        console.log("Status da resposta HTTP do Webhook:", res.status);
    } catch (e) {
        console.error("Erro na requisição:", e.message);
    }
}

testarDespesa();
