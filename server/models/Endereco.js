const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Endereco = sequelize.define('Endereco', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  passageiro_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  apelido: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  endereco_completo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  }
}, {
  tableName: 'enderecos',
  timestamps: true,
});

module.exports = Endereco;
