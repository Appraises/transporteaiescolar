const { Motorista, sequelize } = require('./models');

async function setup() {
    await sequelize.sync();
    await Motorista.findOrCreate({
        where: { telefone: '5511999999999@s.whatsapp.net' },
        defaults: { nome: 'Motorista Teste', telefone: '5511999999999@s.whatsapp.net', status: 'ativo' }
    });
    console.log("Motorista de teste garantido no banco.");
}

setup();
