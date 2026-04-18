const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Op } = require('sequelize');
const Motorista = require('../models/Motorista');
const Assinatura = require('../models/Assinatura');
const Passageiro = require('../models/Passageiro');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'gestor_van_admin_secret_2026';

class AdminController {

  /**
   * POST /api/admin/login
   * Autentica o admin com credenciais do .env e retorna JWT
   */
  async login(req, res) {
    try {
      const { user, password } = req.body;
      const adminUser = process.env.ADMIN_USER || 'admin';
      const adminPass = process.env.ADMIN_PASS || 'gestor2026';

      if (user !== adminUser || password !== adminPass) {
        return res.status(401).json({ error: 'Credenciais de admin inválidas.' });
      }

      const token = jwt.sign(
        { role: 'admin', user: adminUser },
        ADMIN_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({ token, user: adminUser });
    } catch (error) {
      console.error('[AdminController] Erro no login:', error);
      return res.status(500).json({ error: 'Erro interno no login.' });
    }
  }

  /**
   * GET /api/admin/stats
   * Retorna KPIs agregados: motoristas, MRR, churn, etc.
   */
  async getStats(req, res) {
    try {
      const totalMotoristas = await Motorista.count();
      const motoristasAtivos = await Motorista.count({ where: { status: 'ativo' } });
      const motoristasInativos = totalMotoristas - motoristasAtivos;

      // MRR = soma de valor_plano de assinaturas ativas
      const assinaturasAtivas = await Assinatura.findAll({ where: { status: 'ativo' } });
      const mrr = assinaturasAtivas.reduce((acc, a) => acc + (a.valor_plano || 0), 0);

      // Churn do mês atual: assinaturas que foram canceladas/expiradas neste mês
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const canceladosMes = await Assinatura.count({
        where: {
          status: { [Op.in]: ['cancelado', 'expirado'] },
          data_fim: { [Op.gte]: inicioMes }
        }
      });

      // Base de ativos no início do mês (ativos + cancelados este mês = base)
      const baseInicio = assinaturasAtivas.length + canceladosMes;
      const churnRate = baseInicio > 0 ? ((canceladosMes / baseInicio) * 100).toFixed(1) : 0;

      // Total de passageiros na plataforma
      const totalPassageiros = await Passageiro.count();

      return res.status(200).json({
        totalMotoristas,
        motoristasAtivos,
        motoristasInativos,
        mrr,
        churnRate: parseFloat(churnRate),
        canceladosMes,
        totalPassageiros,
        totalAssinaturas: assinaturasAtivas.length,
      });
    } catch (error) {
      console.error('[AdminController] Erro ao buscar stats:', error);
      return res.status(500).json({ error: 'Erro ao buscar métricas admin.' });
    }
  }

  /**
   * GET /api/admin/motoristas
   * Lista todos os motoristas com dados de assinatura e contagem de passageiros
   */
  async listarMotoristas(req, res) {
    try {
      const motoristas = await Motorista.findAll({
        order: [['id', 'ASC']],
        include: [{
          model: Assinatura,
          required: false,
          where: { status: 'ativo' },
          limit: 1,
          order: [['createdAt', 'DESC']]
        }]
      });

      const lista = [];
      for (let i = 0; i < motoristas.length; i++) {
        const m = motoristas[i];
        const qtdPassageiros = await Passageiro.count({ where: { motorista_id: m.id } });
        const assinatura = m.Assinaturas && m.Assinaturas[0];

        lista.push({
          numero: i + 1,
          id: m.id,
          nome: m.nome,
          telefone: m.telefone,
          status: m.status,
          qtdPassageiros,
          valorPlano: assinatura ? assinatura.valor_plano : null,
          statusAssinatura: assinatura ? assinatura.status : 'sem_assinatura',
          dataAtivacao: m.createdAt,
          dataInicioPlano: assinatura ? assinatura.data_inicio : null,
        });
      }

      return res.status(200).json(lista);
    } catch (error) {
      console.error('[AdminController] Erro ao listar motoristas:', error);
      return res.status(500).json({ error: 'Erro ao listar motoristas.' });
    }
  }

  /**
   * GET /api/admin/motoristas/:id
   * Detalhe completo de um motorista
   */
  async detalheMotorista(req, res) {
    try {
      const { id } = req.params;
      const motorista = await Motorista.findByPk(id, {
        include: [{ model: Assinatura }]
      });

      if (!motorista) {
        return res.status(404).json({ error: 'Motorista não encontrado.' });
      }

      const qtdPassageiros = await Passageiro.count({ where: { motorista_id: id } });
      const passageiros = await Passageiro.findAll({
        where: { motorista_id: id },
        attributes: ['id', 'nome', 'turno', 'onboarding_step']
      });

      return res.status(200).json({
        ...motorista.toJSON(),
        qtdPassageiros,
        passageiros
      });
    } catch (error) {
      console.error('[AdminController] Erro ao buscar detalhe:', error);
      return res.status(500).json({ error: 'Erro ao buscar detalhe do motorista.' });
    }
  }

  /**
   * PUT /api/admin/motoristas/:id/plano
   * Atualiza o valor do plano de um motorista
   */
  async atualizarPlano(req, res) {
    try {
      const { id } = req.params;
      const { valor_plano } = req.body;

      if (!valor_plano || valor_plano <= 0) {
        return res.status(400).json({ error: 'Valor do plano inválido.' });
      }

      let assinatura = await Assinatura.findOne({
        where: { motorista_id: id, status: 'ativo' }
      });

      if (assinatura) {
        assinatura.valor_plano = valor_plano;
        await assinatura.save();
      } else {
        assinatura = await Assinatura.create({
          motorista_id: id,
          valor_plano,
          status: 'ativo',
          data_inicio: new Date()
        });
      }

      return res.status(200).json({ message: 'Plano atualizado.', assinatura });
    } catch (error) {
      console.error('[AdminController] Erro ao atualizar plano:', error);
      return res.status(500).json({ error: 'Erro ao atualizar plano.' });
    }
  }

  /**
   * GET /api/admin/evolution/qrcode
   * Proxy para buscar QR Code da Evolution API
   */
  async getQRCode(req, res) {
    try {
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const apiToken = process.env.EVOLUTION_API_TOKEN;
      const instanceId = process.env.INSTANCE_ID || 'van_bot';

      if (!evolutionUrl || evolutionUrl === 'http://localhost:8080') {
        // Modo mock/dev: retorna um QR fake para testar a UI
        return res.status(200).json({
          status: 'mock',
          message: 'Evolution API não configurada. Modo demonstração.',
          mockMode: true,
        });
      }

      const url = `${evolutionUrl}/instance/connect/${instanceId}`;
      const response = await axios.get(url, {
        headers: { 'apikey': apiToken }
      });

      return res.status(200).json(response.data);
    } catch (error) {
      console.error('[AdminController] Erro ao buscar QR Code:', error.message);
      return res.status(500).json({
        error: 'Falha ao conectar com a Evolution API.',
        detail: error.message
      });
    }
  }

  /**
   * GET /api/admin/evolution/status
   * Verifica status da conexão da instância Evolution
   */
  async getEvolutionStatus(req, res) {
    try {
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const apiToken = process.env.EVOLUTION_API_TOKEN;
      const instanceId = process.env.INSTANCE_ID || 'van_bot';

      if (!evolutionUrl || evolutionUrl === 'http://localhost:8080') {
        return res.status(200).json({
          status: 'mock',
          instance: instanceId,
          mockMode: true,
          message: 'Evolution API em modo mock local.'
        });
      }

      const url = `${evolutionUrl}/instance/connectionState/${instanceId}`;
      const response = await axios.get(url, {
        headers: { 'apikey': apiToken }
      });

      return res.status(200).json({
        status: response.data?.instance?.state || response.data?.state || 'unknown',
        instance: instanceId,
        mockMode: false,
        data: response.data
      });
    } catch (error) {
      console.error('[AdminController] Erro ao checar status Evolution:', error.message);
      return res.status(200).json({
        status: 'disconnected',
        instance: instanceId,
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();
