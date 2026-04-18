const express = require('express');
const router = express.Router();
const ApiController = require('../controllers/ApiController');
const ViagemController = require('../controllers/ViagemController');
const AlunosController = require('../controllers/AlunosController');
const ConfigController = require('../controllers/ConfigController');
const FinanceiroController = require('../controllers/FinanceiroController');
const MotoristaController = require('../controllers/MotoristaController');

router.get('/dashboard/stats', ApiController.getDashboardStats);
router.get('/alunos', AlunosController.listar);
router.get('/financeiro', FinanceiroController.listarDashboard);

router.get('/config', ConfigController.obter);
router.post('/config', ConfigController.salvar);

router.post('/motoristas/pagamento', MotoristaController.webhookPagamento);

router.post('/viagens/calcular-rota', ViagemController.calcularRotaOtima);

module.exports = router;
