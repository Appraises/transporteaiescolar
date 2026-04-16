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
  }
}, {
  tableName: 'viagens',
  timestamps: true,
});

module.exports = Viagem;
