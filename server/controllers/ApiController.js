const Passageiro = require('../models/Passageiro');
const Financeiro = require('../models/Financeiro');
const Viagem = require('../models/Viagem');
const Despesa = require('../models/Despesa');
const { Op } = require('sequelize');

class ApiController {
  
  async getDashboardStats(req, res) {
    try {
      const motoristaId = req.motoristaId;
      const passageiros = await Passageiro.findAll({
        where: { motorista_id: motoristaId },
        attributes: ['id']
      });
      const passageiroIds = passageiros.map(p => p.id);
      const passageiroWhere = passageiroIds.length > 0
        ? { passageiro_id: { [Op.in]: passageiroIds } }
        : { passageiro_id: null };

      const ativosCount = await Passageiro.count({
        where: { motorista_id: motoristaId, onboarding_step: 'CONCLUIDO' }
      });
      const mensalidades = await Financeiro.findAll({
        where: { ...passageiroWhere, status_pagamento: 'pago' }
      });
      const despesas = await Despesa.findAll({ where: { motorista_id: motoristaId } });

      let receitaBruta = 0;
      mensalidades.forEach(m => receitaBruta += m.valor_mensalidade);

      let custosTotais = 0;
      despesas.forEach(d => custosTotais += d.valor);
      
      const stats = {
        lucroMes: receitaBruta - custosTotais,
        receitaBruta: receitaBruta,
        custosTotais: custosTotais,
        inadimplentes: await Financeiro.count({
          where: { ...passageiroWhere, status_pagamento: 'atrasado' }
        }),
        ativos: ativosCount || 0,
        viagensHoje: await Viagem.count({
          where: {
            motorista_id: motoristaId,
            data: new Date().toISOString().split('T')[0]
          }
        })
      };

      res.status(200).json(stats);

    } catch (error) {
      console.error('[ApiController] Erro ao buscar stats:', error);
      res.status(500).json({ error: 'Falha interna' });
    }
  }

}

module.exports = new ApiController();
