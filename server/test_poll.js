const axios = require('axios');
require('dotenv').config();

async function test() {
    const url = `${process.env.EVOLUTION_API_URL}/message/sendPoll/van_bot`;
    const payload = {
        number: "120363408172221517@g.us",
        name: "Teste de Enquete",
        selectableCount: 1,
        values: ["Vou", "Não Vou"]
    };

    try {
        console.log('Enviando para:', url);
        const res = await axios.post(url, payload, {
            headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
        });
        console.log('Sucesso:', res.data);
    } catch (err) {
        console.error('Erro:', err.response?.data || err.message);
    }
}

test();
