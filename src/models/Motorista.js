const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Motorista = sequelize.define('Motorista', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: false, // ID do WhatsApp, e.g., 5511999999999@s.whatsapp.net
    unique: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'ativo',
  }
}, {
  tableName: 'motoristas',
  timestamps: true,
});

module.exports = Motorista;
