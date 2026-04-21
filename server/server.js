const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// --- SISTEMA DE LOGS PARA DEBUG NO PAINEL ---
const logFile = path.join(__dirname, 'app.log');
fs.appendFileSync(logFile, `\n\n=========================================\n[SISTEMA] Novo Log (Restart) iniciado em ${new Date().toLocaleString()}\n=========================================\n`);

const patchConsole = (method) => {
  const original = console[method];
  console[method] = (...args) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    fs.appendFileSync(logFile, `${new Date().toLocaleTimeString()} [${method.toUpperCase()}] ${msg}\n`);
    original.apply(console, args);
  };
};
['log', 'error', 'warn', 'info'].forEach(patchConsole);
// ------------------------------------------

console.log('[Sistema] Carregando modelos...');
const { sequelize } = require('./models');
console.log('[Sistema] Carregando rotas...');
const routes = require('./routes');
console.log('[Sistema] Carregando serviços de agendamento...');
const CronService = require('./services/CronService');

console.log('[Sistema] Inicializando Express...');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/', routes);

const PORT = process.env.PORT || 3000;

// Inicializa a conexão com o banco e o servidor
const init = async () => {
  try {
    // Sincroniza os modelos com o banco de dados. 
    console.log('[Banco de Dados] Iniciando sincronização...');
    await sequelize.sync({ force: false, alter: false });
    console.log('[Banco de Dados] SQLite conectado e modelos sincronizados com sucesso.');

    // Liga os Agendamentos da Nossa Logística Automática
    console.log('[CronService] Iniciando agendamentos...');
    await CronService.startCronJobs();
    console.log('[CronService] Agendamentos carregados com sucesso.');

    app.listen(PORT, () => {
        console.log(`[Servidor] Em execução na porta ${PORT}`);
    });
  } catch (error) {
    console.error('[CRITICAL] Erro ao conectar com o banco de dados ou iniciar o servidor:', error);
  }
};

init();

