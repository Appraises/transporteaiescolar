const Passageiro = require('../models/Passageiro');
const Financeiro = require('../models/Financeiro');
const Viagem = require('../models/Viagem');

class ApiController {
  
  async getDashboardStats(req, res) {
    try {
      // Mocked logics until full SQLite seed is done, but queried securely.
      const ativosCount = await Passageiro.count();
      
      const stats = {
        lucroMes: 0, // Implementar query na DB Financeiro
        inadimplentes: 0,
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
