const Config = require('../models/Config');
const CronService = require('../services/CronService');

class ConfigController {
  
  async obter(req, res) {
    try {
      const configs = await Config.findAll();
      const formatado = {};
      configs.forEach(c => formatado[c.chave] = c.valor);
      
      // Defaults se vier vazio
      res.status(200).json({
        baseAddress: formatado['baseAddress'] || 'Avenida Pres, 1000 - SP',
        manhaParams: {
          enquete: formatado['cron_enquete_manha'] || '05:00',
          fechamento: formatado['cron_fechamento_manha'] || '05:55'
        },
        tardeParams: {
          enquete: formatado['cron_enquete_tarde'] || '11:00',
          fechamento: formatado['cron_fechamento_tarde'] || '11:55'
        },
        noiteParams: {
          enquete: formatado['cron_enquete_noite'] || '17:00',
          fechamento: formatado['cron_fechamento_noite'] || '17:55'
        }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro config' });
    }
  }

  async salvar(req, res) {
    try {
      const { baseAddress, manhaParams, tardeParams, noiteParams } = req.body;
      
      const upsert = async (chave, valor) => {
        let conf = await Config.findOne({ where: { chave } });
        if (conf) { conf.valor = valor; await conf.save(); }
        else { await Config.create({ chave, valor }); }
      };

      await upsert('baseAddress', baseAddress);
      
      await upsert('cron_enquete_manha', manhaParams.enquete);
      await upsert('cron_fechamento_manha', manhaParams.fechamento);
      
      await upsert('cron_enquete_tarde', tardeParams.enquete);
      await upsert('cron_fechamento_tarde', tardeParams.fechamento);

      await upsert('cron_enquete_noite', noiteParams.enquete);
      await upsert('cron_fechamento_noite', noiteParams.fechamento);

      // Reinicia os Cron Jobs na RAM pra assumirem as horas novas
      await CronService.startCronJobs();

      res.status(200).json({ status: 'ok' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Falha salvar config' });
    }
  }

}

module.exports = new ConfigController();
