const jwt = require('jsonwebtoken');
const Motorista = require('../models/Motorista');
const { normalizePhone } = require('../utils/phoneHelper');
const { verifyPassword } = require('../utils/passwordHash');

const MOTORISTA_SECRET = process.env.MOTORISTA_SECRET || process.env.ADMIN_SECRET || 'gestor_van_motorista_secret_2026';

class AuthController {
  async loginMotorista(req, res) {
    try {
      const login = req.body.telefone || req.body.user || req.body.login;
      const password = req.body.password || req.body.senha;

      if (!login || !password) {
        return res.status(400).json({ error: 'Telefone e senha sao obrigatorios.' });
      }

      const telefone = normalizePhone(login);
      const motorista = await Motorista.findOne({ where: { telefone, status: 'ativo' } });

      if (!motorista || !verifyPassword(password, motorista.senha_hash)) {
        return res.status(401).json({ error: 'Telefone ou senha invalidos.' });
      }

      const token = jwt.sign(
        { role: 'motorista', motorista_id: motorista.id, telefone: motorista.telefone },
        MOTORISTA_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        token,
        motorista: {
          id: motorista.id,
          nome: motorista.nome,
          telefone: motorista.telefone
        }
      });
    } catch (error) {
      console.error('[AuthController] Erro no login do motorista:', error);
      return res.status(500).json({ error: 'Erro interno no login.' });
    }
  }
}

module.exports = new AuthController();
