const axios = require('axios');
require('dotenv').config();

async function setWebhook() {
    const url = `${process.env.EVOLUTION_API_URL}/webhook/set/van_bot`;
    const payload = {
        url: "http://host.docker.internal:3000/webhook/evolution",
        enabled: true,
        webhookByEvents: false,
        events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "SEND_MESSAGE",
            "CONTACTS_UPSERT",
            "CONTACTS_UPDATE",
            "PRESENCE_UPDATE",
            "CHATS_UPSERT",
            "CHATS_UPDATE",
            "CHATS_DELETE",
            "GROUPS_UPSERT",
            "GROUPS_UPDATE",
            "GROUP_PARTICIPANTS_UPDATE",
            "CONNECTION_UPDATE",
            "CALL"
        ]
    };

    try {
        const res = await axios.post(url, payload, {
            headers: { 'apikey': process.env.EVOLUTION_API_TOKEN }
        });
        console.log('Webhook configurado com sucesso:', res.data);
    } catch (err) {
        console.error('Erro ao configurar webhook:', err.response?.data || err.message);
    }
}

setWebhook();
