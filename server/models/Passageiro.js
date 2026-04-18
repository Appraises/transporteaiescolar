const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Passageiro = sequelize.define('Passageiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefone_responsavel: {
    type: DataTypes.STRING, // ID do WhatsApp do responsável ou do próprio aluno
    allowNull: false,
  },
  grupo_id: {
    type: DataTypes.STRING, // ID do grupo no WhatsApp para o qual o bot manda avisos, se houver
    allowNull: true,
  },
  cep: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  logradouro: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  numero: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bairro: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cidade: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.FLOAT, // Usado para geocode e roteirização
    allowNull: true,
  },
  longitude: {
    type: DataTypes.FLOAT, // Usado para geocode e roteirização
    allowNull: true,
  },
  turno: {
    type: DataTypes.STRING, // JSON string or comma-separated: 'manha,tarde'
    allowNull: true,
  },
  mensalidade: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  onboarding_step: {
    type: DataTypes.STRING, // e.g., 'AGUARDANDO_NOME', 'AGUARDANDO_TURNO', 'AGUARDANDO_ENDERECO', 'CONCLUIDO'
    allowNull: true,
    defaultValue: 'CONCLUIDO'
  },
  motorista_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // true until fully migrated
  },
  endereco_ida_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  endereco_volta_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'passageiros',
  timestamps: true,
});

module.exports = Passageiro;
