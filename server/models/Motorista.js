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
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  meta_manha: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  meta_tarde: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  meta_noite: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  em_ferias: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  pausa_inicio: {
    type: DataTypes.DATEONLY, // Formato YYYY-MM-DD
    allowNull: true,
  },
  pausa_fim: {
    type: DataTypes.DATEONLY, // Formato YYYY-MM-DD
    allowNull: true,
  },
  raio_notificacao: {
    type: DataTypes.INTEGER, // Em metros. Ex: 2500 = 2.5km
    defaultValue: 2500,
  },
  escola_nome: {
    type: DataTypes.STRING, // Nome da escola/universidade. Ex: "UFS"
    allowNull: true,
  },
  escola_latitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  escola_longitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  }
}, {
  tableName: 'motoristas',
  timestamps: true,
});

module.exports = Motorista;
