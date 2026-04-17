const Passageiro = require('../models/Passageiro');

class AlunosController {
  
  async listar(req, res) {
    try {
      const alunos = await Passageiro.findAll({
        order: [['nome', 'ASC']]
      });
      res.status(200).json(alunos);
    } catch (error) {
      console.error('[AlunosController] Falha ao listar alunos:', error);
      res.status(500).json({ error: 'Erro ao buscar alunos.' });
    }
  }

}

module.exports = new AlunosController();
