const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Config = sequelize.define('Config', {
  chave: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  motorista_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
