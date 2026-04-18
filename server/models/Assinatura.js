const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Assinatura = sequelize.define('Assinatura', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  motorista_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  valor_plano: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 50.00, // Default R$50, ajustável pelo admin
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'ativo', // ativo, cancelado, expirado, trial
  },
  data_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  data_fim: {
    type: DataTypes.DATEONLY,
    allowNull: true, // null = assinatura ativa
  },
  stripe_subscription_id: {
    type: DataTypes.STRING,
    allowNull: true, // Futuro: integração com gateway
  }
}, {
  tableName: 'assinaturas',
  timestamps: true,
});

module.exports = Assinatura;
