const sequelize = require('../config/database');
const Motorista = require('./Motorista');
const Passageiro = require('./Passageiro');
const Viagem = require('./Viagem');
const ViagemPassageiro = require('./ViagemPassageiro');
const Financeiro = require('./Financeiro');

// Relacionamentos

// Motorista <-> Viagem
Motorista.hasMany(Viagem, { foreignKey: 'motorista_id' });
Viagem.belongsTo(Motorista, { foreignKey: 'motorista_id' });

// Viagem <-> Passageiro (N:M através de ViagemPassageiro)
Viagem.belongsToMany(Passageiro, { through: ViagemPassageiro, foreignKey: 'viagem_id' });
Passageiro.belongsToMany(Viagem, { through: ViagemPassageiro, foreignKey: 'passageiro_id' });

// Também podemos ter a relação direta da tabela pivô se precisarmos acessar ordens ou status especificamente
Viagem.hasMany(ViagemPassageiro, { foreignKey: 'viagem_id' });
ViagemPassageiro.belongsTo(Viagem, { foreignKey: 'viagem_id' });
Passageiro.hasMany(ViagemPassageiro, { foreignKey: 'passageiro_id' });
ViagemPassageiro.belongsTo(Passageiro, { foreignKey: 'passageiro_id' });

// Passageiro <-> Financeiro
Passageiro.hasMany(Financeiro, { foreignKey: 'passageiro_id' });
Financeiro.belongsTo(Passageiro, { foreignKey: 'passageiro_id' });

module.exports = {
  sequelize,
  Motorista,
  Passageiro,
  Viagem,
  ViagemPassageiro,
  Financeiro
};
