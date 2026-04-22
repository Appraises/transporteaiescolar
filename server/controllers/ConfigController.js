const Config = require('../models/Config');
const CronService = require('../services/CronService');
const { Op } = require('sequelize');

function formatarConfig(configs, motoristaId) {
  const formatado = {};
  configs.forEach(c => {
    if (c.motorista_id === motoristaId || !formatado[c.chave]) {
      formatado[c.chave] = c.valor;
    }
  });

  return {
    baseAddress: formatado['baseAddress'] || 'Avenida Pres, 1000 - SP',
    schoolAddress: formatado['schoolAddress'] || '',
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
  };
}

class ConfigController {

  async obter(req, res) {
    try {
      const motoristaId = req.motoristaId;
      const configs = await Config.findAll({
        where: {
          [Op.or]: [
            { motorista_id: motoristaId },
            { motorista_id: null }
          ]
        }
      });

      res.status(200).json(formatarConfig(configs, motoristaId));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro config' });
    }
  }

  async salvar(req, res) {
    try {
      const motoristaId = req.motoristaId;
      const { baseAddress, schoolAddress, manhaParams, tardeParams, noiteParams } = req.body;

      const upsert = async (chave, valor) => {
        let conf = await Config.findOne({ where: { chave, motorista_id: motoristaId } });
        if (conf) {
          conf.valor = valor;
          await conf.save();
        } else {
          await Config.create({ chave, valor, motorista_id: motoristaId });
        }
      };

      await upsert('baseAddress', baseAddress);
      await upsert('schoolAddress', schoolAddress);

      await upsert('cron_enquete_manha', manhaParams.enquete);
      await upsert('cron_fechamento_manha', manhaParams.fechamento);

      await upsert('cron_enquete_tarde', tardeParams.enquete);
      await upsert('cron_fechamento_tarde', tardeParams.fechamento);

      await upsert('cron_enquete_noite', noiteParams.enquete);
      await upsert('cron_fechamento_noite', noiteParams.fechamento);

      await CronService.startCronJobs();

      res.status(200).json({ status: 'ok' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Falha salvar config' });
    }
  }

}

module.exports = new ConfigController();
