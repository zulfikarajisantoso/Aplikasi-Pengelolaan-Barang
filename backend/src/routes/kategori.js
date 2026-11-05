const express = require('express');
const { query } = require('../db');
const { authenticate, requireActiveUser, requireRole } = require('../middleware/auth');
const { isNonEmptyString, maxLen } = require('../utils/validators');

const router = express.Router();

router.use(authenticate, requireActiveUser);

// GET /api/kategori?search=&page=&pageSize=&all=1
router.get('/', async (req, res, next) => {
  try {
    const { search = '', all } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize, 10) || 10, 1);

    const where = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(kode ILIKE $${params.length} OR nama ILIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    if (all === '1') {
      const result = await query(`SELECT * FROM kategori ${whereSql} ORDER BY nama ASC`, params);
      return res.json({ data: result.rows });
    }

    const countResult = await query(`SELECT COUNT(*)::int AS count FROM kategori ${whereSql}`, params);
    const total = countResult.rows[0].count;

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const result = await query(
      `SELECT * FROM kategori ${whereSql} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({ data: result.rows, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const { kode, nama } = req.body || {};
    if (!isNonEmptyString(kode) || !maxLen(kode, 10)) {
      return res.status(400).json({ error: 'Kode kategori wajib diisi, maksimal 10 karakter.' });
    }
    if (!isNonEmptyString(nama) || !maxLen(nama, 100)) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi, maksimal 100 karakter.' });
    }
    const result = await query(
      'INSERT INTO kategori (kode, nama) VALUES ($1, $2) RETURNING *',
      [kode.trim(), nama.trim()]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Kode kategori sudah digunakan.' });
    }
    next(err);
  }
});

router.put('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const { kode, nama } = req.body || {};
    if (!isNonEmptyString(kode) || !maxLen(kode, 10)) {
      return res.status(400).json({ error: 'Kode kategori wajib diisi, maksimal 10 karakter.' });
    }
    if (!isNonEmptyString(nama) || !maxLen(nama, 100)) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi, maksimal 100 karakter.' });
    }
    const result = await query(
      'UPDATE kategori SET kode = $1, nama = $2 WHERE id = $3 RETURNING *',
      [kode.trim(), nama.trim(), req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Kode kategori sudah digunakan.' });
    }
    next(err);
  }
});

router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await query('DELETE FROM kategori WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Kategori tidak dapat dihapus karena masih digunakan oleh data lain.' });
    }
    next(err);
  }
});

module.exports = router;
