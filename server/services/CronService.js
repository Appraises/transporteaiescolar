const cron = require('node-cron');
const PollService = require('./PollService');
const CronService = require('./CronService');
const ViagemController = require('../controllers/ViagemController');
const Config = require('../models/Config');
const AntiBanService = require('./AntiBanService');
const EvolutionService = require('./EvolutionService');
const Passageiro = require('../models/Passageiro');
const Financeiro = require('../models/Financeiro');

// Dicionário de Jobs na memória (para podermos destruí-los e recriá-los quando a UI mudar configs)
const activeJobs = {};

class CronService {
  
  async startCronJobs() {
    console.log('[CronService] Carregando Agendamentos...');
    await this.schedularTurno('manha', '05:00', '05:55');
    await this.schedularTurno('tarde', '11:00', '11:55');
    await this.schedularTurno('noite', '17:00', '17:55');
    
    // Liga o Robô Cobrador Diário as 08:00
    this.agendarCobrancasDiarias();
  }

  agendarCobrancasDiarias() {
    if(activeJobs['cobranca_diaria']) activeJobs['cobranca_diaria'].stop();
    
    // Roda todo dia as 08:00 da manhã
    activeJobs['cobranca_diaria'] = cron.schedule('0 8 * * *', async () => {
      console.log('[Cron] Rodando Robô Financeiro Anti-Ban...');
      try {
         const pendentes = await Financeiro.findAll({ where: { status_pagamento: 'pendente' } });
         for (const reqFin of pendentes) {
            const pass = await Passageiro.findByPk(reqFin.passageiro_id);
            if (pass && pass.telefone) {
               // Envia o lembrete humanizado pro usuário usando Zero-Widths e sinonimos
               const msg = AntiBanService.gerarCobrancaHumanizada(pass.nome, reqFin.valor_mensalidade);
               await EvolutionService.sendMessage(pass.telefone, msg);
            }
         }
      } catch (e) {
        console.error('[Cron] Falha ao enviar cobrancas:', e);
      }
    });
  }

  async schedularTurno(turnoNome, fallbackHoraEnquete, fallbackHoraFechamento) {
    // Busca do SQLite se houver override do painel Config
    const dbConfigEnquete = await Config.findOne({ where: { chave: `cron_enquete_${turnoNome}` } });
    const dbConfigFechamento = await Config.findOne({ where: { chave: `cron_fechamento_${turnoNome}` } });

    const horaEnquete = dbConfigEnquete ? dbConfigEnquete.valor : fallbackHoraEnquete;
    const horaFechamento = dbConfigFechamento ? dbConfigFechamento.valor : fallbackHoraFechamento;

    // Destrói agendamentos velhos se existirem (Reload de Config)
    if(activeJobs[`${turnoNome}_enquete`]) activeJobs[`${turnoNome}_enquete`].stop();
    if(activeJobs[`${turnoNome}_fechamento`]) activeJobs[`${turnoNome}_fechamento`].stop();

    // 1. Agendamento do Disparo da Enquete
    const [hhE, mmE] = horaEnquete.split(':');
    const cronEnquete = `${mmE} ${hhE} * * 1-5`; // Seg a Sexta
    
    activeJobs[`${turnoNome}_enquete`] = cron.schedule(cronEnquete, () => {
      console.log(`[Cron] Acionando Enquete de ${turnoNome}`);
      PollService.dispararEnquete(turnoNome);
      // Aqui idealmente também criariamos a row "Viagem" no banco com status 'aberta'
    });

    // 2. Agendamento do Fechamento e Envio Pro Motorista
    const [hhF, mmF] = horaFechamento.split(':');
    const cronFechamento = `${mmF} ${hhF} * * 1-5`; // Seg a Sexta

    activeJobs[`${turnoNome}_fechamento`] = cron.schedule(cronFechamento, () => {
      console.log(`[Cron] Fechando Rota de ${turnoNome} e enviando para Caminho Ótimo...`);
      // O mock da rota. Em produção, passaremos o turno e buscaremos quem de fato votou
      // Utilizando um Req Modificado Mock apenas para preencher o controller 
      const mockReq = { body: { turno: turnoNome, motoristaId: 1 } };
      const mockRes = { status: () => ({ json: (data) => console.log('Rota despachada', data) }) };
      ViagemController.calcularRotaOtima(mockReq, mockRes);
    });

    console.log(`[CronService] Turno ${turnoNome} -> Poll: ${horaEnquete} | Fechamento: ${horaFechamento}`);
  }

}

module.exports = new CronService();
