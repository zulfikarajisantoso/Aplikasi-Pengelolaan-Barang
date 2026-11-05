const express = require('express');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { query, pool } = require('../db');
const { authenticate, requireActiveUser } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');
const { isNonEmptyString, maxLen, isNumeric } = require('../utils/validators');

const router = express.Router();

router.use(authenticate, requireActiveUser);

const SORTABLE_COLUMNS = {
  tanggal: 'bm.tanggal',
  asal_barang: 'bm.asal_barang',
  total: 'total',
};

function buildFilters(reqQuery) {
  const { kategoriId, subKategoriId, tahun, search = '' } = reqQuery;
  const where = [];
  const params = [];

  if (kategoriId) {
    params.push(kategoriId);
    where.push(`bm.kategori_id = $${params.length}`);
  }
  if (subKategoriId) {
    params.push(subKategoriId);
    where.push(`bm.sub_kategori_id = $${params.length}`);
  }
  if (tahun) {
    params.push(Number(tahun));
    where.push(`EXTRACT(YEAR FROM bm.tanggal) = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(bm.asal_barang ILIKE $${params.length} OR sk.nama ILIKE $${params.length})`);
  }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const BASE_SELECT = `
  SELECT
    bm.id, bm.tanggal, bm.operator_id, bm.kategori_id, bm.sub_kategori_id,
    bm.asal_barang, bm.nomor_surat, bm.lampiran_path, bm.status_verifikasi, bm.created_at,
    u.nama AS operator_nama,
    k.kode AS kategori_kode, k.nama AS kategori_nama,
    sk.nama AS sub_kategori_nama, sk.batas_harga AS sub_kategori_batas_harga,
    COALESCE(SUM(bmi.total), 0)::numeric AS total
  FROM barang_masuk bm
  JOIN users u ON u.id = bm.operator_id
  JOIN kategori k ON k.id = bm.kategori_id
  JOIN sub_kategori sk ON sk.id = bm.sub_kategori_id
  LEFT JOIN barang_masuk_item bmi ON bmi.barang_masuk_id = bm.id
`;

const GROUP_BY = `
  GROUP BY bm.id, u.nama, k.kode, k.nama, sk.nama, sk.batas_harga
`;

async function attachItems(rows) {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const itemsResult = await query(
    `SELECT * FROM barang_masuk_item WHERE barang_masuk_id = ANY($1) ORDER BY created_at ASC`,
    [ids]
  );
  const byParent = {};
  itemsResult.rows.forEach((item) => {
    if (!byParent[item.barang_masuk_id]) byParent[item.barang_masuk_id] = [];
    byParent[item.barang_masuk_id].push(item);
  });
  return rows.map((r) => ({ ...r, items: byParent[r.id] || [] }));
}

// GET /api/barang-masuk/years
router.get('/years', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT EXTRACT(YEAR FROM tanggal)::int AS year FROM barang_masuk ORDER BY year DESC`
    );
    res.json({ data: result.rows.map((r) => r.year) });
  } catch (err) {
    next(err);
  }
});

// GET /api/barang-masuk
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize, 10) || 10, 1);
    const sortBy = SORTABLE_COLUMNS[req.query.sortBy] || 'bm.tanggal';
    const sortDir = (req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const { whereSql, params } = buildFilters(req.query);

    const countResult = await query(
      `SELECT COUNT(*)::int AS count FROM (
        SELECT bm.id FROM barang_masuk bm
        JOIN users u ON u.id = bm.operator_id
        JOIN kategori k ON k.id = bm.kategori_id
        JOIN sub_kategori sk ON sk.id = bm.sub_kategori_id
        ${whereSql}
      ) t`,
      params
    );
    const total = countResult.rows[0].count;

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const result = await query(
      `${BASE_SELECT} ${whereSql} ${GROUP_BY} ORDER BY ${sortBy} ${sortDir}, bm.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    const data = await attachItems(result.rows);
    res.json({ data, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// GET /api/barang-masuk/export
router.get('/export', async (req, res, next) => {
  try {
    const sortBy = SORTABLE_COLUMNS[req.query.sortBy] || 'bm.tanggal';
    const sortDir = (req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const { whereSql, params } = buildFilters(req.query);

    const result = await query(
      `${BASE_SELECT} ${whereSql} ${GROUP_BY} ORDER BY ${sortBy} ${sortDir}, bm.created_at DESC`,
      params
    );
    const rows = await attachItems(result.rows);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Barang Masuk');
    sheet.columns = [
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Asal Barang', key: 'asal_barang', width: 24 },
      { header: 'Operator', key: 'operator', width: 18 },
      { header: 'Kategori', key: 'kategori', width: 20 },
      { header: 'Sub Kategori', key: 'sub_kategori', width: 20 },
      { header: 'Kode', key: 'kode', width: 10 },
      { header: 'Nama Barang', key: 'nama_barang', width: 24 },
      { header: 'Harga', key: 'harga', width: 14 },
      { header: 'Jumlah', key: 'jumlah', width: 10 },
      { header: 'Satuan', key: 'satuan', width: 10 },
      { header: 'Total', key: 'total', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };

    rows.forEach((bm) => {
      const items = bm.items.length > 0 ? bm.items : [{}];
      items.forEach((item) => {
        sheet.addRow({
          tanggal: bm.tanggal ? new Date(bm.tanggal).toISOString().slice(0, 10) : '',
          asal_barang: bm.asal_barang,
          operator: bm.operator_nama,
          kategori: bm.kategori_nama,
          sub_kategori: bm.sub_kategori_nama,
          kode: bm.kategori_kode,
          nama_barang: item.nama_barang || '',
          harga: item.harga !== undefined ? Number(item.harga) : '',
          jumlah: item.jumlah !== undefined ? Number(item.jumlah) : '',
          satuan: item.satuan || '',
          total: item.total !== undefined ? Number(item.total) : Number(bm.total),
          status: bm.status_verifikasi ? 'Terverifikasi' : 'Belum Terverifikasi',
        });
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="barang-masuk.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// GET /api/barang-masuk/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `${BASE_SELECT} WHERE bm.id = $1 ${GROUP_BY}`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data barang masuk tidak ditemukan.' });
    }
    const [data] = await attachItems(result.rows);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

function parseItems(raw) {
  let items;
  try {
    items = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return { error: 'Format data barang tidak valid.' };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Minimal harus ada 1 barang.' };
  }
  for (const item of items) {
    if (!isNonEmptyString(item.namaBarang) || !maxLen(item.namaBarang, 200)) {
      return { error: 'Nama barang wajib diisi, maksimal 200 karakter.' };
    }
    if (!isNumeric(item.harga) || Number(item.harga) < 0) {
      return { error: 'Harga barang wajib diisi dengan angka yang valid.' };
    }
    if (!isNumeric(item.jumlah) || Number(item.jumlah) < 0) {
      return { error: 'Jumlah barang wajib diisi dengan angka yang valid.' };
    }
    if (!isNonEmptyString(item.satuan) || !maxLen(item.satuan, 40)) {
      return { error: 'Satuan wajib diisi, maksimal 40 karakter.' };
    }
  }
  return { items };
}

async function validateCommon(body) {
  const { tanggal, operatorId, kategoriId, subKategoriId, asalBarang, nomorSurat } = body;
  if (!isNonEmptyString(tanggal)) return 'Tanggal wajib diisi.';
  if (!isNonEmptyString(operatorId)) return 'Operator wajib dipilih.';
  if (!isNonEmptyString(kategoriId)) return 'Kategori wajib dipilih.';
  if (!isNonEmptyString(subKategoriId)) return 'Sub kategori wajib dipilih.';
  if (!isNonEmptyString(asalBarang) || !maxLen(asalBarang, 200)) return 'Asal barang wajib diisi, maksimal 200 karakter.';
  if (nomorSurat && !maxLen(nomorSurat, 100)) return 'Nomor surat maksimal 100 karakter.';
  return null;
}

// POST /api/barang-masuk (multipart/form-data)
router.post('/', upload.single('lampiran'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const commonError = await validateCommon(body);
    if (commonError) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: commonError });
    }

    const { items, error: itemsError } = parseItems(body.items);
    if (itemsError) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: itemsError });
    }

    // Operator role may only submit on their own behalf.
    let operatorId = body.operatorId;
    if (req.user.role === 'Operator') {
      operatorId = req.user.id;
    }

    // Recompute totals server-side - never trust the client.
    const computedItems = items.map((it) => ({
      namaBarang: it.namaBarang.trim(),
      harga: Number(it.harga),
      jumlah: Number(it.jumlah),
      satuan: it.satuan.trim(),
      total: Number(it.harga) * Number(it.jumlah),
      tglExpired: it.tglExpired || null,
    }));
    const grandTotal = computedItems.reduce((sum, it) => sum + it.total, 0);

    const subKategoriResult = await client.query('SELECT batas_harga FROM sub_kategori WHERE id = $1', [body.subKategoriId]);
    if (subKategoriResult.rows.length === 0) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Sub kategori tidak valid.' });
    }
    const batasHarga = Number(subKategoriResult.rows[0].batas_harga);
    if (grandTotal > batasHarga) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        error: `Total harga barang (Rp ${grandTotal.toLocaleString('id-ID')}) melebihi batas harga sub kategori (Rp ${batasHarga.toLocaleString('id-ID')}).`,
      });
    }

    await client.query('BEGIN');

    const lampiranPath = req.file ? `/uploads/${req.file.filename}` : null;

    const bmResult = await client.query(
      `INSERT INTO barang_masuk (tanggal, operator_id, kategori_id, sub_kategori_id, asal_barang, nomor_surat, lampiran_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [body.tanggal, operatorId, body.kategoriId, body.subKategoriId, body.asalBarang.trim(), body.nomorSurat || null, lampiranPath]
    );
    const barangMasukId = bmResult.rows[0].id;

    for (const item of computedItems) {
      await client.query(
        `INSERT INTO barang_masuk_item (barang_masuk_id, nama_barang, harga, jumlah, satuan, total, tgl_expired)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [barangMasukId, item.namaBarang, item.harga, item.jumlah, item.satuan, item.total, item.tglExpired]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ data: { id: barangMasukId } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/barang-masuk/:id (multipart/form-data)
router.put('/:id', upload.single('lampiran'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const existing = await client.query('SELECT * FROM barang_masuk WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Data barang masuk tidak ditemukan.' });
    }
    const existingRecord = existing.rows[0];

    if (req.user.role === 'Operator' && existingRecord.operator_id !== req.user.id) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ error: 'Anda hanya dapat mengubah data milik Anda sendiri.' });
    }

    const body = req.body || {};
    const commonError = await validateCommon(body);
    if (commonError) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: commonError });
    }

    const { items, error: itemsError } = parseItems(body.items);
    if (itemsError) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: itemsError });
    }

    let operatorId = body.operatorId;
    if (req.user.role === 'Operator') {
      operatorId = req.user.id;
    }

    const computedItems = items.map((it) => ({
      namaBarang: it.namaBarang.trim(),
      harga: Number(it.harga),
      jumlah: Number(it.jumlah),
      satuan: it.satuan.trim(),
      total: Number(it.harga) * Number(it.jumlah),
      tglExpired: it.tglExpired || null,
    }));
    const grandTotal = computedItems.reduce((sum, it) => sum + it.total, 0);

    const subKategoriResult = await client.query('SELECT batas_harga FROM sub_kategori WHERE id = $1', [body.subKategoriId]);
    if (subKategoriResult.rows.length === 0) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Sub kategori tidak valid.' });
    }
    const batasHarga = Number(subKategoriResult.rows[0].batas_harga);
    if (grandTotal > batasHarga) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        error: `Total harga barang (Rp ${grandTotal.toLocaleString('id-ID')}) melebihi batas harga sub kategori (Rp ${batasHarga.toLocaleString('id-ID')}).`,
      });
    }

    await client.query('BEGIN');

    let lampiranPath = existingRecord.lampiran_path;
    if (req.file) {
      if (existingRecord.lampiran_path) {
        const oldFile = path.join(UPLOAD_DIR, path.basename(existingRecord.lampiran_path));
        fs.unlink(oldFile, () => {});
      }
      lampiranPath = `/uploads/${req.file.filename}`;
    } else if (body.removeLampiran === 'true') {
      if (existingRecord.lampiran_path) {
        const oldFile = path.join(UPLOAD_DIR, path.basename(existingRecord.lampiran_path));
        fs.unlink(oldFile, () => {});
      }
      lampiranPath = null;
    }

    await client.query(
      `UPDATE barang_masuk SET tanggal = $1, operator_id = $2, kategori_id = $3, sub_kategori_id = $4,
       asal_barang = $5, nomor_surat = $6, lampiran_path = $7 WHERE id = $8`,
      [body.tanggal, operatorId, body.kategoriId, body.subKategoriId, body.asalBarang.trim(), body.nomorSurat || null, lampiranPath, id]
    );

    // Replace-all-on-edit for items.
    await client.query('DELETE FROM barang_masuk_item WHERE barang_masuk_id = $1', [id]);
    for (const item of computedItems) {
      await client.query(
        `INSERT INTO barang_masuk_item (barang_masuk_id, nama_barang, harga, jumlah, satuan, total, tgl_expired)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, item.namaBarang, item.harga, item.jumlah, item.satuan, item.total, item.tglExpired]
      );
    }

    await client.query('COMMIT');
    res.json({ data: { id } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/barang-masuk/:id/verifikasi
router.patch('/:id/verifikasi', async (req, res, next) => {
  try {
    const current = await query('SELECT status_verifikasi FROM barang_masuk WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Data barang masuk tidak ditemukan.' });
    }
    const newStatus = !current.rows[0].status_verifikasi;
    const result = await query(
      'UPDATE barang_masuk SET status_verifikasi = $1 WHERE id = $2 RETURNING status_verifikasi',
      [newStatus, req.params.id]
    );
    res.json({ data: { statusVerifikasi: result.rows[0].status_verifikasi } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/barang-masuk/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM barang_masuk WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Data barang masuk tidak ditemukan.' });
    }
    if (req.user.role === 'Operator' && existing.rows[0].operator_id !== req.user.id) {
      return res.status(403).json({ error: 'Anda hanya dapat menghapus data milik Anda sendiri.' });
    }
    if (existing.rows[0].lampiran_path) {
      const oldFile = path.join(UPLOAD_DIR, path.basename(existing.rows[0].lampiran_path));
      fs.unlink(oldFile, () => {});
    }
    await query('DELETE FROM barang_masuk WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
