const jwt = require('jsonwebtoken');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'gestor_van_admin_secret_2026';

/**
 * Middleware de autenticação para rotas do Admin Master Dashboard.
 * Valida o JWT enviado no header Authorization: Bearer <token>
 */
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de admin não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Não é admin.' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = adminAuth;
