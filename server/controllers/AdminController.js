const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Op } = require('sequelize');
const Motorista = require('../models/Motorista');
const Assinatura = require('../models/Assinatura');
const Passageiro = require('../models/Passageiro');
const LlmService = require('../services/LlmService');
const EvolutionService = require('../services/EvolutionService');
const Financeiro = require('../models/Financeiro');
const Config = require('../models/Config');
const Endereco = require('../models/Endereco');
const Despesa = require('../models/Despesa');
const { normalizePhone } = require('../utils/phoneHelper');
const CronService = require('../services/CronService');

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
      const adminPass = process.env.ADMIN_PASS || 'pombas';

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
   * POST /api/admin/motoristas
   * Cria um motorista manualmente. Bypass do pagamento.
   */
  async criarMotorista(req, res) {
    try {
      const { nome, telefone, valor_plano } = req.body;

      if (!nome || !telefone) {
        return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });
      }

      // Adiciona sufixo e código do país (55) se necessário
      const phoneId = normalizePhone(telefone);

      // Verifica se já existe
      const jaExiste = await Motorista.findOne({ where: { telefone: phoneId } });
      if (jaExiste) {
        if (jaExiste.status === 'lead') {
          // "Promove" o lead para ativo
          jaExiste.nome = nome;
          jaExiste.status = 'ativo';
          await jaExiste.save();
          
          if (valor_plano) {
            const Assinatura = require('../models/Assinatura');
            await Assinatura.create({
              motorista_id: jaExiste.id,
              valor_plano,
              status: 'ativo',
              data_inicio: new Date()
            });
          }
          
          return res.status(200).json(jaExiste);
        }
        return res.status(400).json({ error: 'Motorista com este telefone já existe e já está ativo.' });
      }

      const novoMotorista = await Motorista.create({
        nome,
        telefone: phoneId,
        status: 'ativo'
      });

      // Cria a assinatura ativa
      const plano = valor_plano && valor_plano > 0 ? valor_plano : 99.90; // Default
      await Assinatura.create({
        motorista_id: novoMotorista.id,
        valor_plano: plano,
        status: 'ativo',
        data_inicio: new Date()
      });

      // --- ONBOARDING PROATIVO ---
      // Como o motorista acabou de ser criado/pago, mandamos o tutorial imediatamente
      try {
        const welcomeMsg = LlmService.getDriverOnboardingMessage(novoMotorista.nome);
        await EvolutionService.sendMessage(novoMotorista.telefone, welcomeMsg);
        
        // Marca como enviado para não repetir no primeiro 'Oi' (apenas se for General Chat depois)
        novoMotorista.boas_vindas_enviada = true;
        await novoMotorista.save();
        
        console.log(`[Admin] Onboarding proativo disparado para ${novoMotorista.nome} (${novoMotorista.telefone})`);
      } catch (err) {
        console.error('[Admin] Falha ao enviar onboarding proativo:', err.message);
        // Não barramos a resposta de sucesso do HTTP se apenas o WhatsApp falhar
      }

      return res.status(201).json({ message: 'Motorista criado com sucesso!', motorista: novoMotorista });
    } catch (error) {
      console.error('[AdminController] Erro ao criar motorista:', error);
      return res.status(500).json({ error: 'Erro ao criar motorista.' });
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
        include: [
          { model: Assinatura },
          { model: Despesa }
        ]
      });

      if (!motorista) {
        return res.status(404).json({ error: 'Motorista não encontrado.' });
      }

      const qtdPassageiros = await Passageiro.count({ where: { motorista_id: id } });
      const passageiros = await Passageiro.findAll({
        where: { motorista_id: id },
        attributes: ['id', 'nome', 'turno', 'onboarding_step']
      });

      const motoristaData = motorista.toJSON();
      delete motoristaData.senha_hash;

      return res.status(200).json({
        ...motoristaData,
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
        await Assinatura.create({
          motorista_id: id,
          valor_plano: valor_plano,
          status: 'ativo',
          data_inicio: new Date()
        });
      }

      return res.status(200).json({ message: 'Plano atualizado com sucesso!' });
    } catch (error) {
      console.error('[AdminController] Erro ao atualizar plano:', error);
      return res.status(500).json({ error: 'Erro ao atualizar plano.' });
    }
  }

  /**
   * GET /api/admin/evolution/config
   * Busca as configurações atuais da instância no Evolution API
   */
  async getEvolutionConfig(req, res) {
    try {
      const settings = await EvolutionService.fetchSettings();
      const webhook = await EvolutionService.fetchWebhookConfig();

      return res.status(200).json({
        settings: settings || {},
        webhook: webhook || {}
      });
    } catch (error) {
      console.error('[AdminController] Erro ao buscar config Evolution:', error);
      return res.status(500).json({ error: 'Erro ao buscar configurações da Evolution API.' });
    }
  }

  /**
   * POST /api/admin/evolution/config
   * Atualiza as configurações da instância (Webhook/Settings)
   */
  async updateEvolutionConfig(req, res) {
    try {
      const { settings, webhook } = req.body;

      if (settings) {
        await EvolutionService.setInstanceSettings(settings);
      }

      if (webhook) {
        // Evolution v2 exige 'url' e 'enabled' no payload
        const currentWebhook = await EvolutionService.fetchWebhookConfig();
        const finalWebhook = {
          enabled: true,
          url: webhook.url || (currentWebhook && currentWebhook.url) || `${process.env.APP_URL || 'http://localhost:3000'}/webhook/evolution`,
          base64: !!webhook.base64,
          // Garante eventos padrão se não houver nenhum, pois são obrigatórios na v2
          events: (webhook.events && webhook.events.length) ? webhook.events : (currentWebhook && currentWebhook.events && currentWebhook.events.length ? currentWebhook.events : ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE', 'SEND_MESSAGE', 'CONNECTION_UPDATE', 'TYPEING_INDICATOR'])
        };
        await EvolutionService.setWebhookConfig(finalWebhook);
      }

      return res.status(200).json({ message: 'Configurações atualizadas com sucesso!' });
    } catch (error) {
      console.error('[AdminController] Erro ao atualizar config Evolution:', error);
      return res.status(500).json({ error: 'Erro ao atualizar configurações da Evolution API.' });
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

      if (!evolutionUrl) {
        return res.status(200).json({
          status: 'mock',
          message: 'Evolution API não configurada. Modo demonstração.',
          mockMode: true,
        });
      }

      let response;
      try {
        const url = `${evolutionUrl}/instance/connect/${instanceId}`;
        response = await axios.get(url, { headers: { 'apikey': apiToken } });
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Instância não existe. Vamos criar.
          await axios.post(`${evolutionUrl}/instance/create`, {
            instanceName: instanceId,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true
          }, { headers: { 'apikey': apiToken } });
          
          const url = `${evolutionUrl}/instance/connect/${instanceId}`;
          response = await axios.get(url, { headers: { 'apikey': apiToken } });
        } else {
          throw err;
        }
      }

      if (response.data?.instance?.state === 'open' && !response.data?.base64) {
         return res.status(400).json({ error: 'A instância já está conectada. Atualize a página.' });
      }

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

      if (!evolutionUrl) {
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

  /**
   * GET /api/admin/logs
   * Retorna os últimos logs do PM2 ou erro se não instalado
   */
  async getLogs(req, res) {
    try {
      // Tenta rodar o comando do PM2
      // --lines 100 retorna as últimas 100 linhas
      // --nostream garante que o comando termine e retorne o buffer
      exec('pm2 logs --lines 100 --nostream', (error, stdout, stderr) => {
        if (error) {
          // Se falhar (ex: rodando localmente sem PM2), tenta ler o app.log local
          const logFilePath = path.join(__dirname, '..', 'app.log');
          
          if (fs.existsSync(logFilePath)) {
            const localLogs = fs.readFileSync(logFilePath, 'utf8');
            // Retorna as últimas 100 linhas do arquivo
            const lines = localLogs.split('\n').slice(-100).join('\n');
            return res.status(200).send(`[MODO LOCAL] Lendo app.log...\n\n${lines}`);
          }

          return res.status(200).send(
            `[SISTEMA] PM2 não detectado e arquivo app.log não encontrado.\n` +
            `[SISTEMA] Verifique se o servidor foi iniciado corretamente.`
          );
        }

        // Retorna o output real do PM2
        return res.status(200).send(stdout || stderr);
      });
    } catch (err) {
      console.error('[AdminController] Erro fatal ao buscar logs:', err);
      return res.status(500).json({ error: 'Erro ao processar logs do servidor.' });
    }
  }

  // ==========================================
  // GESTÃO DO MOTORISTA (ALUNOS, FINANCEIRO, CONFIG)
  // ==========================================

  async getMotoristaAlunos(req, res) {
    try {
      const { id } = req.params;
      const alunos = await Passageiro.findAll({
        where: { motorista_id: id },
        order: [['nome', 'ASC']]
      });
      return res.status(200).json(alunos);
    } catch (error) {
      console.error('[AdminController] Erro getMotoristaAlunos:', error);
      return res.status(500).json({ error: 'Erro ao buscar alunos do motorista.' });
    }
  }

  async criarAluno(req, res) {
    try {
      const { id } = req.params;
      const { nome, telefone_responsavel, turno, endereco, mensalidade } = req.body;
      
      const aluno = await Passageiro.create({
        motorista_id: id,
        nome,
        telefone_responsavel,
        turno: turno || 'manha',
        mensalidade: mensalidade || 0,
        bairro: endereco,
        onboarding_step: 'CONCLUIDO'
      });
      return res.status(201).json(aluno);
    } catch (error) {
      console.error('[AdminController] Erro criarAluno:', error);
      return res.status(500).json({ error: 'Erro ao criar aluno.' });
    }
  }

  async editarAluno(req, res) {
    try {
      const { id, alunoId } = req.params;
      const { nome, telefone_responsavel, turno, endereco, mensalidade } = req.body;

      const aluno = await Passageiro.findOne({ where: { id: alunoId, motorista_id: id } });
      if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

      aluno.nome = nome || aluno.nome;
      aluno.telefone_responsavel = telefone_responsavel || aluno.telefone_responsavel;
      aluno.turno = turno || aluno.turno;
      aluno.bairro = endereco !== undefined ? endereco : aluno.bairro;
      aluno.mensalidade = mensalidade !== undefined ? mensalidade : aluno.mensalidade;

      await aluno.save();
      return res.status(200).json(aluno);
    } catch (error) {
      console.error('[AdminController] Erro editarAluno:', error);
      return res.status(500).json({ error: 'Erro ao editar aluno.' });
    }
  }

  async deletarAluno(req, res) {
    try {
      const { id, alunoId } = req.params;
      const deleted = await Passageiro.destroy({ where: { id: alunoId, motorista_id: id } });
      if (!deleted) return res.status(404).json({ error: 'Aluno não encontrado' });
      return res.status(200).json({ message: 'Aluno removido com sucesso.' });
    } catch (error) {
      console.error('[AdminController] Erro deletarAluno:', error);
      return res.status(500).json({ error: 'Erro ao remover aluno.' });
    }
  }

  async getMotoristaFinanceiro(req, res) {
    try {
      const { id } = req.params;
      
      // 1. Receitas (Mensalidades dos Passageiros)
      const passageiros = await Passageiro.findAll({ where: { motorista_id: id } });
      const pIds = passageiros.map(p => p.id);
      
      let receitas = [];
      if (pIds.length > 0) {
        const financas = await Financeiro.findAll({ where: { passageiro_id: pIds }, order: [['data_vencimento', 'DESC']] });
        receitas = financas.map(fin => {
          const pass = passageiros.find(p => p.id === fin.passageiro_id);
          return {
            id: fin.id,
            nome_passageiro: pass ? pass.nome : 'Desconhecido',
            turno: pass ? pass.turno : 'N/A',
            valor: fin.valor_mensalidade,
            vencimento: fin.data_vencimento,
            status: fin.status_pagamento
          };
        });
      }

      // 2. Despesas (Gastos com a Van via Bot)
      const despesas = await Despesa.findAll({ 
        where: { motorista_id: id },
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({ receitas, despesas });
    } catch (error) {
      console.error('[AdminController] Erro getMotoristaFinanceiro:', error);
      return res.status(500).json({ error: 'Erro ao buscar financeiro do motorista.' });
    }
  }

  async getMotoristaConfig(req, res) {
    try {
      const { id } = req.params;
      const configs = await Config.findAll({
        where: {
          [Op.or]: [
            { motorista_id: id },
            { motorista_id: null } // Busca os defaults globais também
          ]
        }
      });
      
      const formatado = {};
      configs.forEach(c => {
        // Se já tiver a config específica do motorista, não sobrescreve com a global (assumindo a ordem correta ou processamento aqui)
        if (c.motorista_id === parseInt(id) || !formatado[c.chave]) {
          formatado[c.chave] = c.valor;
        }
      });
      
      return res.status(200).json({
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
      });
    } catch (error) {
      console.error('[AdminController] Erro getMotoristaConfig:', error);
      return res.status(500).json({ error: 'Erro config do motorista' });
    }
  }

  async salvarMotoristaConfig(req, res) {
    try {
      const { id } = req.params;
      const { baseAddress, schoolAddress, manhaParams, tardeParams, noiteParams } = req.body;
      
      const upsert = async (chave, valor) => {
        let conf = await Config.findOne({ where: { chave, motorista_id: id } });
        if (conf) { 
          conf.valor = valor; 
          await conf.save(); 
        } else { 
          await Config.create({ chave, valor, motorista_id: id }); 
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

      // Idealmente, recarregar os cron jobs passando o motorista_id para o CronService.
      // O CronService teria que ser atualizado depois para ter escopo por motorista.
      await CronService.startCronJobs();

      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('[AdminController] Erro salvarMotoristaConfig:', error);
      return res.status(500).json({ error: 'Falha ao salvar config do motorista' });
    }
  }

  async deletarMotorista(req, res) {
    try {
      const { id } = req.params;
      const motorista = await Motorista.findByPk(id);
      if (!motorista) return res.status(404).json({ error: 'Motorista não encontrado' });

      console.log(`[Admin] Excluindo motorista ID ${id} e dados vinculados...`);

      // Limpeza manual de tabelas vinculadas (SQLite cascade fallback)
      await Assinatura.destroy({ where: { motorista_id: id } });
      await Config.destroy({ where: { motorista_id: id } });
      await Despesa.destroy({ where: { motorista_id: id } });
      await require('../models/GrupoMotorista').destroy({ where: { motorista_id: id } });

      const viagens = await require('../models/Viagem').findAll({ where: { motorista_id: id } });
      const vIds = viagens.map(v => v.id);
      if (vIds.length > 0) {
        await require('../models/ViagemPassageiro').destroy({ where: { viagem_id: { [Op.in]: vIds } } });
        await require('../models/Viagem').destroy({ where: { motorista_id: id } });
      }

      const passageiros = await Passageiro.findAll({ where: { motorista_id: id } });
      const pIds = passageiros.map(p => p.id);
      if (pIds.length > 0) {
        await Financeiro.destroy({ where: { passageiro_id: { [Op.in]: pIds } } });
        await Endereco.destroy({ where: { passageiro_id: { [Op.in]: pIds } } });
        await Passageiro.destroy({ where: { motorista_id: id } });
      }

      await motorista.destroy();
      return res.status(200).json({ status: 'Excluído com sucesso' });
    } catch (error) {
      console.error('[AdminController] Erro ao deletar motorista:', error);
      return res.status(500).json({ error: 'Erro interno ao deletar motorista' });
    }
  }
}

module.exports = new AdminController();
