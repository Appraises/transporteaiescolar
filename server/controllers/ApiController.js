const Passageiro = require('../models/Passageiro');
const Financeiro = require('../models/Financeiro');
const Viagem = require('../models/Viagem');

class ApiController {
  
  async getDashboardStats(req, res) {
    try {
      // Mocked logics until full SQLite seed is done, but queried securely.
      const ativosCount = await Passageiro.count();
      const mensalidades = await Financeiro.findAll({ where: { status_pagamento: 'pago' } });
      const despesas = await require('../models/Despesa').findAll();

      let receitaBruta = 0;
      mensalidades.forEach(m => receitaBruta += m.valor_mensalidade);

      let custosTotais = 0;
      despesas.forEach(d => custosTotais += d.valor);
      
      const stats = {
        lucroMes: receitaBruta - custosTotais,
        receitaBruta: receitaBruta,
        custosTotais: custosTotais,
        inadimplentes: await Financeiro.count({ where: { status_pagamento: 'atrasado' } }),
        ativos: ativosCount || 0,
        viagensHoje: 0
      };

      res.status(200).json(stats);

    } catch (error) {
      console.error('[ApiController] Erro ao buscar stats:', error);
      res.status(500).json({ error: 'Falha interna' });
    }
  }

}

module.exports = new ApiController();
