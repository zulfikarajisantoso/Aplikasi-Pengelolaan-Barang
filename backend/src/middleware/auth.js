const jwt = require('jsonwebtoken');
const { query } = require('../db');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login kembali.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, username }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

// Re-checks the user still exists and is not locked (defends against a
// token minted before a lock, or for a deleted user).
async function requireActiveUser(req, res, next) {
  try {
    const result = await query('SELECT id, role, is_locked FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
    }
    if (result.rows[0].is_locked) {
      return res.status(403).json({ error: 'Akun Anda terkunci. Hubungi administrator.' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke fitur ini.' });
    }
    next();
  };
}

module.exports = { authenticate, requireActiveUser, requireRole };
