const jwt = require('jsonwebtoken');
const Motorista = require('../models/Motorista');

const MOTORISTA_SECRET = process.env.MOTORISTA_SECRET || process.env.ADMIN_SECRET || 'gestor_van_motorista_secret_2026';

async function motoristaAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token do motorista nao fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, MOTORISTA_SECRET);
    if (decoded.role !== 'motorista' || !decoded.motorista_id) {
      return res.status(401).json({ error: 'Token invalido.' });
    }

    const motorista = await Motorista.findOne({
      where: { id: decoded.motorista_id, status: 'ativo' }
    });

    if (!motorista) {
      return res.status(401).json({ error: 'Motorista inativo ou nao encontrado.' });
    }

    req.motorista = motorista;
    req.motoristaId = motorista.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido ou expirado.' });
  }
}

module.exports = motoristaAuth;
