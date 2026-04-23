const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PollDispatch = sequelize.define('PollDispatch', {
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
    type: DataTypes.STRING,
    allowNull: false,
  },
  motorista_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  group_jid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'enviando',
  },
  erro: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'poll_dispatches',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['data', 'turno', 'group_jid']
    }
  ]
});

module.exports = PollDispatch;
