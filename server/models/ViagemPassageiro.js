const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ViagemPassageiro = sequelize.define('ViagemPassageiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  viagem_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  passageiro_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status_ida: {
    type: DataTypes.STRING,
    defaultValue: 'aguardando_resposta', // aguardando_resposta, confirmado, ausente, em_rota, recolhido, entregue
  },
  status_volta: {
    type: DataTypes.STRING,
    defaultValue: 'aguardando_resposta',
  },
  ordem_rota: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'viagem_passageiros',
  timestamps: true,
});

module.exports = ViagemPassageiro;
