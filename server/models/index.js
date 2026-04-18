const sequelize = require('../config/database');
const Motorista = require('./Motorista');
const Passageiro = require('./Passageiro');
const Viagem = require('./Viagem');
const ViagemPassageiro = require('./ViagemPassageiro');
const Financeiro = require('./Financeiro');
const Config = require('./Config');
const GrupoMotorista = require('./GrupoMotorista');
const Despesa = require('./Despesa');

// Relacionamentos

// Motorista <-> Viagem, Motorista <-> GrupoMotorista, Motorista <-> Passageiro, Motorista <-> Despesa
Motorista.hasMany(Viagem, { foreignKey: 'motorista_id' });
Viagem.belongsTo(Motorista, { foreignKey: 'motorista_id' });

Motorista.hasMany(GrupoMotorista, { foreignKey: 'motorista_id' });
GrupoMotorista.belongsTo(Motorista, { foreignKey: 'motorista_id' });

Motorista.hasMany(Passageiro, { foreignKey: 'motorista_id' });
Passageiro.belongsTo(Motorista, { foreignKey: 'motorista_id' });

Motorista.hasMany(Despesa, { foreignKey: 'motorista_id' });
Despesa.belongsTo(Motorista, { foreignKey: 'motorista_id' });

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

// Passageiro <-> Endereco
const Endereco = require('./Endereco');
Passageiro.hasMany(Endereco, { foreignKey: 'passageiro_id' });
Endereco.belongsTo(Passageiro, { foreignKey: 'passageiro_id' });
Passageiro.belongsTo(Endereco, { as: 'enderecoIda', foreignKey: 'endereco_ida_id' });
Passageiro.belongsTo(Endereco, { as: 'enderecoVolta', foreignKey: 'endereco_volta_id' });

module.exports = {
  sequelize,
  Motorista,
  Passageiro,
  Viagem,
  ViagemPassageiro,
  Financeiro,
  Config,
  GrupoMotorista,
  Despesa,
  Endereco
};
