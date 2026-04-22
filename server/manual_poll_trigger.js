require('dotenv').config();
const { Motorista, GrupoMotorista } = require('./models');
const PollService = require('./services/PollService');

async function trigger() {
    console.log('[Manual Trigger] Iniciando disparo manual do turno: tarde');
    try {
        const grupos = await GrupoMotorista.findAll();
        let disparos = 0;

        for (const grupo of grupos) {
            const m = await Motorista.findOne({ where: { id: grupo.motorista_id, status: 'ativo' }});
            if (!m) continue;

            console.log(`[Manual Trigger] Disparando para motorista ${m.nome} no grupo ${grupo.nome_grupo || grupo.group_jid}`);
            await PollService.dispararEnquete('tarde', grupo.group_jid);
            disparos++;
        }

        console.log(`[Manual Trigger] Finalizado. Total de disparos: ${disparos}`);
        process.exit(0);
    } catch (error) {
        console.error('[Manual Trigger] Erro:', error);
        process.exit(1);
    }
}

trigger();
