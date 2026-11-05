const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const result = await query(
      'SELECT id, role, username, password_hash, nama, email, is_locked FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const user = result.rows[0];

    if (user.is_locked) {
      return res.status(403).json({ error: 'Akun terkunci. Hubungi administrator.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, role, username, nama, email, is_locked FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    const user = result.rows[0];
    if (user.is_locked) {
      return res.status(403).json({ error: 'Akun terkunci. Hubungi administrator.' });
    }
    return res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
