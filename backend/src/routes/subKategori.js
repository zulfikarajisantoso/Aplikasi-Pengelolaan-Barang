const express = require('express');
const { query } = require('../db');
const { authenticate, requireActiveUser, requireRole } = require('../middleware/auth');
const { isNonEmptyString, maxLen, isNumeric } = require('../utils/validators');

const router = express.Router();

router.use(authenticate, requireActiveUser);

// GET /api/sub-kategori?search=&page=&pageSize=&kategoriId=&all=1
router.get('/', async (req, res, next) => {
  try {
    const { search = '', kategoriId, all } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize, 10) || 10, 1);

    const where = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(sk.nama ILIKE $${params.length} OR k.nama ILIKE $${params.length})`);
    }
    if (kategoriId) {
      params.push(kategoriId);
      where.push(`sk.kategori_id = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const baseSelect = `
      SELECT sk.*, k.nama AS kategori_nama, k.kode AS kategori_kode
      FROM sub_kategori sk
      JOIN kategori k ON k.id = sk.kategori_id
      ${whereSql}
    `;

    if (all === '1') {
      const result = await query(`${baseSelect} ORDER BY sk.nama ASC`, params);
      return res.json({ data: result.rows });
    }

    const countResult = await query(
      `SELECT COUNT(*)::int AS count FROM sub_kategori sk JOIN kategori k ON k.id = sk.kategori_id ${whereSql}`,
      params
    );
    const total = countResult.rows[0].count;

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const result = await query(
      `${baseSelect} ORDER BY sk.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({ data: result.rows, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

function validateBody(body) {
  const { kategoriId, nama, batasHarga } = body || {};
  if (!isNonEmptyString(kategoriId)) return 'Kategori wajib dipilih.';
  if (!isNonEmptyString(nama) || !maxLen(nama, 100)) return 'Nama sub kategori wajib diisi, maksimal 100 karakter.';
  if (!isNumeric(batasHarga) || Number(batasHarga) < 0) return 'Batas harga wajib diisi dengan angka yang valid.';
  return null;
}

router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const errorMsg = validateBody(req.body);
    if (errorMsg) return res.status(400).json({ error: errorMsg });
    const { kategoriId, nama, batasHarga } = req.body;
    const result = await query(
      'INSERT INTO sub_kategori (kategori_id, nama, batas_harga) VALUES ($1, $2, $3) RETURNING *',
      [kategoriId, nama.trim(), Number(batasHarga)]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Kategori yang dipilih tidak valid.' });
    }
    next(err);
  }
});

router.put('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const errorMsg = validateBody(req.body);
    if (errorMsg) return res.status(400).json({ error: errorMsg });
    const { kategoriId, nama, batasHarga } = req.body;
    const result = await query(
      'UPDATE sub_kategori SET kategori_id = $1, nama = $2, batas_harga = $3 WHERE id = $4 RETURNING *',
      [kategoriId, nama.trim(), Number(batasHarga), req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub kategori tidak ditemukan.' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Kategori yang dipilih tidak valid.' });
    }
    next(err);
  }
});

router.delete('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const result = await query('DELETE FROM sub_kategori WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sub kategori tidak ditemukan.' });
    }
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Sub kategori tidak dapat dihapus karena masih digunakan oleh data lain.' });
    }
    next(err);
  }
});

module.exports = router;
