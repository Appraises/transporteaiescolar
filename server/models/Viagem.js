const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Viagem = sequelize.define('Viagem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  turno: {
    type: DataTypes.STRING, // manha, tarde, noite
    allowNull: false,
  },
  motorista_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pendente', // pendente, rota_gerada, em_andamento, finalizada
  },
  parada_atual: {
    type: DataTypes.INTEGER, // Índice do próximo passageiro na ordem_rota (começa em 1)
    defaultValue: 1,
  },
  trecho_ativo: {
    type: DataTypes.STRING, // 'ida' ou 'volta' - qual trecho está sendo rastreado
    allowNull: true,
  },
  rota_ida_enviada: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  rota_volta_enviada: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  pedido_gps_enviado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  turno_livre_enviado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}, {
  tableName: 'viagens',
  timestamps: true,
});

module.exports = Viagem;
