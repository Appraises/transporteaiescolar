const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Config = sequelize.define('Config', {
  chave: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  valor: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'configuracoes',
  timestamps: false
});

module.exports = Config;
