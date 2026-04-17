const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Financeiro = sequelize.define('Financeiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  passageiro_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  valor_mensalidade: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  data_vencimento: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status_pagamento: {
    type: DataTypes.STRING,
    defaultValue: 'pendente', // pendente, pago, atrasado
  }
}, {
  tableName: 'financeiro',
  timestamps: true,
});

module.exports = Financeiro;
