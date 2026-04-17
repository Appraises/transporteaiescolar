const Financeiro = require('../models/Financeiro');
const Passageiro = require('../models/Passageiro');

class FinanceiroController {
  
  async listarDashboard(req, res) {
    try {
      const financas = await Financeiro.findAll();
      const resultado = [];

      for(const fin of financas) {
        const pass = await Passageiro.findByPk(fin.passageiro_id);
        if(pass) {
          resultado.push({
            id: fin.id,
            nome_passageiro: pass.nome,
            turno: pass.turno,
            valor: fin.valor_mensalidade,
            vencimento: fin.data_vencimento,
            status: fin.status_pagamento
          });
        }
      }

      res.status(200).json(resultado);
    } catch (error) {
      console.error('[FinanceiroController] Falha:', error);
      res.status(500).json({ error: 'Erro ao buscar financeiro.' });
    }
  }

}

module.exports = new FinanceiroController();
