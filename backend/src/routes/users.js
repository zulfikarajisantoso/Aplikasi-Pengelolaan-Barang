const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { authenticate, requireActiveUser, requireRole } = require('../middleware/auth');
const { inRange, isValidEmail, isValidPassword } = require('../utils/validators');

const router = express.Router();

const SAFE_COLUMNS = 'id, role, username, nama, email, is_locked, created_at';

router.use(authenticate, requireActiveUser);

// GET /api/users?role=&search=&page=&pageSize=&all=1  (used by Barang Masuk form to list operators too)
router.get('/', async (req, res, next) => {
  try {
    const { role = '', search = '', all } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize, 10) || 10, 1);

    // Only Admin can browse the full user management list; any authenticated
    // user may request the Operator list (used to populate the Barang Masuk
    // "Operator" combobox) as long as they explicitly filter role=Operator.
    if (req.user.role !== 'Admin' && role !== 'Operator') {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke fitur ini.' });
    }

    const where = [];
    const params = [];
    if (role) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(username ILIKE $${params.length} OR nama ILIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    if (all === '1') {
      const result = await query(
        `SELECT ${SAFE_COLUMNS} FROM users ${whereSql} ORDER BY nama ASC`,
        params
      );
      return res.json({ data: result.rows });
    }

    const countResult = await query(`SELECT COUNT(*)::int AS count FROM users ${whereSql}`, params);
    const total = countResult.rows[0].count;

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const result = await query(
      `SELECT ${SAFE_COLUMNS} FROM users ${whereSql} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({ data: result.rows, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

function validateCreate(body) {
  const { role, username, password, nama, email } = body || {};
  if (!['Admin', 'Operator'].includes(role)) return 'Role wajib dipilih (Admin/Operator).';
  if (!inRange(username, 8, 100)) return 'Username wajib diisi, 8-100 karakter.';
  if (!isValidPassword(password)) return 'Password wajib diisi, 8-100 karakter, mengandung huruf besar, huruf kecil, dan angka.';
  if (!inRange(nama, 8, 100)) return 'Nama wajib diisi, 8-100 karakter.';
  if (!isValidEmail(email)) return 'Email tidak valid, 8-100 karakter.';
  return null;
}

function validateUpdate(body) {
  const { role, username, password, nama, email } = body || {};
  if (!['Admin', 'Operator'].includes(role)) return 'Role wajib dipilih (Admin/Operator).';
  if (!inRange(username, 8, 100)) return 'Username wajib diisi, 8-100 karakter.';
  if (password && !isValidPassword(password)) return 'Password wajib 8-100 karakter, mengandung huruf besar, huruf kecil, dan angka.';
  if (!inRange(nama, 8, 100)) return 'Nama wajib diisi, 8-100 karakter.';
  if (!isValidEmail(email)) return 'Email tidak valid, 8-100 karakter.';
  return null;
}

router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const errorMsg = validateCreate(req.body);
    if (errorMsg) return res.status(400).json({ error: errorMsg });
    const { role, username, password, nama, email } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (role, username, password_hash, nama, email)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${SAFE_COLUMNS}`,
      [role, username.trim(), passwordHash, nama.trim(), email.trim()]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }
    next(err);
  }
});

router.put('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const errorMsg = validateUpdate(req.body);
    if (errorMsg) return res.status(400).json({ error: errorMsg });
    const { role, username, password, nama, email } = req.body;

    let result;
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      result = await query(
        `UPDATE users SET role = $1, username = $2, password_hash = $3, nama = $4, email = $5
         WHERE id = $6 RETURNING ${SAFE_COLUMNS}`,
        [role, username.trim(), passwordHash, nama.trim(), email.trim(), req.params.id]
      );
    } else {
      result = await query(
        `UPDATE users SET role = $1, username = $2, nama = $3, email = $4
         WHERE id = $5 RETURNING ${SAFE_COLUMNS}`,
        [role, username.trim(), nama.trim(), email.trim(), req.params.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }
    next(err);
  }
});

router.patch('/:id/lock', requireRole('Admin'), async (req, res, next) => {
  try {
    const { isLocked } = req.body || {};
    if (typeof isLocked !== 'boolean') {
      return res.status(400).json({ error: 'Nilai isLocked wajib boolean.' });
    }
    if (req.params.id === req.user.id && isLocked) {
      return res.status(400).json({ error: 'Anda tidak dapat mengunci akun Anda sendiri.' });
    }
    const result = await query(
      `UPDATE users SET is_locked = $1 WHERE id = $2 RETURNING ${SAFE_COLUMNS}`,
      [isLocked, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri.' });
    }
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Pengguna tidak dapat dihapus karena masih memiliki data terkait.' });
    }
    next(err);
  }
});

module.exports = router;
