const crypto = require('crypto');

const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, KEY_LENGTH).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  const parts = String(storedHash).split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const [, salt, hash] = parts;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = {
  hashPassword,
  verifyPassword
};
