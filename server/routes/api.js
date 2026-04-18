const express = require('express');
const router = express.Router();
const ApiController = require('../controllers/ApiController');
const ViagemController = require('../controllers/ViagemController');
const AlunosController = require('../controllers/AlunosController');
const ConfigController = require('../controllers/ConfigController');
const FinanceiroController = require('../controllers/FinanceiroController');
const MotoristaController = require('../controllers/MotoristaController');
const AdminController = require('../controllers/AdminController');
const adminAuth = require('../middleware/adminAuth');

router.get('/dashboard/stats', ApiController.getDashboardStats);
router.get('/alunos', AlunosController.listar);
router.get('/financeiro', FinanceiroController.listarDashboard);

router.get('/config', ConfigController.obter);
router.post('/config', ConfigController.salvar);

router.post('/motoristas/pagamento', MotoristaController.webhookPagamento);

router.post('/viagens/calcular-rota', ViagemController.calcularRotaOtima);

// ========== ROTAS ADMIN MASTER DASHBOARD ==========
router.post('/admin/login', AdminController.login);
router.get('/admin/stats', adminAuth, AdminController.getStats);
router.get('/admin/motoristas', adminAuth, AdminController.listarMotoristas);
router.get('/admin/motoristas/:id', adminAuth, AdminController.detalheMotorista);
router.put('/admin/motoristas/:id/plano', adminAuth, AdminController.atualizarPlano);
router.get('/admin/evolution/qrcode', adminAuth, AdminController.getQRCode);
router.get('/admin/evolution/status', adminAuth, AdminController.getEvolutionStatus);

module.exports = router;

