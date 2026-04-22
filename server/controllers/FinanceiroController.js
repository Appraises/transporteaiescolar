const Financeiro = require('../models/Financeiro');
const Passageiro = require('../models/Passageiro');
const Despesa = require('../models/Despesa');
const { Op } = require('sequelize');

async function getPassageirosDoMotorista(motoristaId) {
  const passageiros = await Passageiro.findAll({ where: { motorista_id: motoristaId } });
  return {
    passageiros,
    ids: passageiros.map(p => p.id),
    byId: new Map(passageiros.map(p => [p.id, p]))
  };
}

class FinanceiroController {

  async listarDashboard(req, res) {
    try {
      const { ids, byId } = await getPassageirosDoMotorista(req.motoristaId);
      if (ids.length === 0) return res.status(200).json([]);

      const financas = await Financeiro.findAll({
        where: { passageiro_id: { [Op.in]: ids } }
      });
      const resultado = [];

      for (const fin of financas) {
        const pass = byId.get(fin.passageiro_id);
        if (pass) {
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

  async listarDespesas(req, res) {
    try {
      const despesas = await Despesa.findAll({
        where: { motorista_id: req.motoristaId },
        order: [['data', 'DESC']]
      });
      res.status(200).json(despesas);
    } catch (error) {
      console.error('[FinanceiroController] Erro listarDespesas:', error);
      res.status(500).json({ error: 'Erro ao buscar despesas.' });
    }
  }

  async criarDespesa(req, res) {
    try {
      const { categoria, valor, descricao, data } = req.body;
      const despesa = await Despesa.create({
        motorista_id: req.motoristaId,
        categoria: categoria || 'Outros',
        valor: parseFloat(valor),
        descricao,
        data: data || new Date()
      });
      res.status(201).json(despesa);
    } catch (error) {
      console.error('[FinanceiroController] Erro criarDespesa:', error);
      res.status(500).json({ error: 'Erro ao criar despesa.' });
    }
  }

  async atualizarDespesa(req, res) {
    try {
      const { id } = req.params;
      const { categoria, valor, descricao, data } = req.body;

      const despesa = await Despesa.findOne({ where: { id, motorista_id: req.motoristaId } });
      if (!despesa) return res.status(404).json({ error: 'Despesa nao encontrada' });

      await despesa.update({
        categoria: categoria || despesa.categoria,
        valor: valor !== undefined ? parseFloat(valor) : despesa.valor,
        descricao: descricao !== undefined ? descricao : despesa.descricao,
        data: data || despesa.data
      });

      res.status(200).json(despesa);
    } catch (error) {
      console.error('[FinanceiroController] Erro atualizarDespesa:', error);
      res.status(500).json({ error: 'Erro ao atualizar despesa.' });
    }
  }

  async deletarDespesa(req, res) {
    try {
      const { id } = req.params;
      const despesa = await Despesa.findOne({ where: { id, motorista_id: req.motoristaId } });
      if (!despesa) return res.status(404).json({ error: 'Despesa nao encontrada' });

      await despesa.destroy();
      res.status(200).json({ message: 'Despesa deletada com sucesso' });
    } catch (error) {
      console.error('[FinanceiroController] Erro deletarDespesa:', error);
      res.status(500).json({ error: 'Erro ao deletar despesa.' });
    }
  }

  async obterGrafico(req, res) {
    try {
      const { ids } = await getPassageirosDoMotorista(req.motoristaId);
      const mensalidadesWhere = ids.length > 0
        ? { passageiro_id: { [Op.in]: ids }, status_pagamento: 'pago' }
        : { passageiro_id: null, status_pagamento: 'pago' };

      const todasMensalidades = await Financeiro.findAll({ where: mensalidadesWhere });
      const todasDespesas = await Despesa.findAll({ where: { motorista_id: req.motoristaId } });

      const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const mapaMeses = new Map();
      const numMeses = 6;

      for (let i = numMeses - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        mapaMeses.set(k, {
          name: mesesLabels[d.getMonth()],
          Receita: 0,
          Custos: 0,
          Lucro: 0
        });
      }

      todasMensalidades.forEach(m => {
        if (!m.data_vencimento) return;
        const key = m.data_vencimento.substring(0, 7);
        if (mapaMeses.has(key)) {
          const dados = mapaMeses.get(key);
          dados.Receita += m.valor_mensalidade;
          dados.Lucro = dados.Receita - dados.Custos;
        }
      });

      todasDespesas.forEach(d => {
        if (!d.data) return;
        const key = d.data.substring(0, 7);
        if (mapaMeses.has(key)) {
          const dados = mapaMeses.get(key);
          dados.Custos += d.valor;
          dados.Lucro = dados.Receita - dados.Custos;
        }
      });

      res.status(200).json(Array.from(mapaMeses.values()));
    } catch (error) {
      console.error('[FinanceiroController] Erro obterGrafico:', error);
      res.status(500).json({ error: 'Erro ao gerar dados do grafico.' });
    }
  }

}

module.exports = new FinanceiroController();
