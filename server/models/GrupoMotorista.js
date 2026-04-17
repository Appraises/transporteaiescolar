const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GrupoMotorista = sequelize.define('GrupoMotorista', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  group_jid: {
    type: DataTypes.STRING, // e.g. 120363000@g.us
    allowNull: false,
    unique: true
  },
  motorista_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nome_grupo: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'grupos_motorista',
  timestamps: true,
});

module.exports = GrupoMotorista;
