const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// --- SISTEMA DE LOGS PARA DEBUG NO PAINEL ---
const logFile = path.join(__dirname, 'app.log');
fs.writeFileSync(logFile, `[SISTEMA] Log iniciado em ${new Date().toLocaleString()}\n`);

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

const { sequelize } = require('./models');
const routes = require('./routes');
const CronService = require('./services/CronService');

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
    // force: false não apaga os dados existentes.
    await sequelize.sync({ force: false, alter: true }); // garante o Config model
    console.log('[Banco de Dados] SQLite conectado e modelos sincronizados com sucesso.');

    // Liga os Agendamentos da Nossa Logística Automática
    await CronService.startCronJobs();

    app.listen(PORT, () => {
        console.log(`[Servidor] Em execução na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados ou iniciar o servidor:', error);
  }
};

init();
