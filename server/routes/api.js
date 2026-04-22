const express = require('express');
const router = express.Router();
const ApiController = require('../controllers/ApiController');
const ViagemController = require('../controllers/ViagemController');
const AlunosController = require('../controllers/AlunosController');
const ConfigController = require('../controllers/ConfigController');
const FinanceiroController = require('../controllers/FinanceiroController');
const MotoristaController = require('../controllers/MotoristaController');
const AdminController = require('../controllers/AdminController');
const AuthController = require('../controllers/AuthController');
const adminAuth = require('../middleware/adminAuth');
const motoristaAuth = require('../middleware/motoristaAuth');

router.post('/auth/login', AuthController.loginMotorista);

router.get('/dashboard/stats', motoristaAuth, ApiController.getDashboardStats);
router.get('/alunos', motoristaAuth, AlunosController.listar);
router.post('/alunos', motoristaAuth, AlunosController.criar);
router.put('/alunos/:id', motoristaAuth, AlunosController.atualizar);

router.get('/financeiro', motoristaAuth, FinanceiroController.listarDashboard);
router.get('/financeiro/despesas', motoristaAuth, FinanceiroController.listarDespesas);
router.post('/financeiro/despesas', motoristaAuth, FinanceiroController.criarDespesa);
router.put('/financeiro/despesas/:id', motoristaAuth, FinanceiroController.atualizarDespesa);
router.delete('/financeiro/despesas/:id', motoristaAuth, FinanceiroController.deletarDespesa);
router.get('/financeiro/grafico', motoristaAuth, FinanceiroController.obterGrafico);

router.get('/config', motoristaAuth, ConfigController.obter);
router.post('/config', motoristaAuth, ConfigController.salvar);

router.post('/motoristas/pagamento', MotoristaController.webhookPagamento);

router.post('/viagens/calcular-rota', motoristaAuth, ViagemController.calcularRotaOtima);

// ========== ROTAS ADMIN MASTER DASHBOARD ==========
router.post('/admin/login', AdminController.login);
router.get('/admin/stats', adminAuth, AdminController.getStats);
router.get('/admin/motoristas', adminAuth, AdminController.listarMotoristas);
router.post('/admin/motoristas', adminAuth, AdminController.criarMotorista);
router.get('/admin/motoristas/:id', adminAuth, AdminController.detalheMotorista);
router.put('/admin/motoristas/:id/plano', adminAuth, AdminController.atualizarPlano);
router.delete('/admin/motoristas/:id', adminAuth, AdminController.deletarMotorista);
router.get('/admin/evolution/qrcode', adminAuth, AdminController.getQRCode);
router.get('/admin/evolution/status', adminAuth, AdminController.getEvolutionStatus);
router.get('/admin/evolution/config', adminAuth, AdminController.getEvolutionConfig);
router.post('/admin/evolution/config', adminAuth, AdminController.updateEvolutionConfig);
router.get('/admin/logs', adminAuth, AdminController.getLogs);

// ========== ROTAS ADMIN GESTÃO DE MOTORISTA ==========
router.get('/admin/motoristas/:id/alunos', adminAuth, AdminController.getMotoristaAlunos);
router.post('/admin/motoristas/:id/alunos', adminAuth, AdminController.criarAluno);
router.put('/admin/motoristas/:id/alunos/:alunoId', adminAuth, AdminController.editarAluno);
router.delete('/admin/motoristas/:id/alunos/:alunoId', adminAuth, AdminController.deletarAluno);

router.get('/admin/motoristas/:id/financeiro', adminAuth, AdminController.getMotoristaFinanceiro);

router.get('/admin/motoristas/:id/config', adminAuth, AdminController.getMotoristaConfig);
router.post('/admin/motoristas/:id/config', adminAuth, AdminController.salvarMotoristaConfig);

module.exports = router;

