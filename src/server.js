require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const routes = require('./routes');

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
    await sequelize.sync({ force: false });
    console.log('[Banco de Dados] SQLite conectado e modelos sincronizados com sucesso.');

    app.listen(PORT, () => {
        console.log(`[Servidor] Em execução na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados ou iniciar o servidor:', error);
  }
};

init();
