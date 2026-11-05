/**
 * Repeatable seed script.
 * Connects via DATABASE_URL, hashes the admin password with bcryptjs, and
 * upserts the admin user plus one sample Kategori / Sub Kategori row.
 *
 * Usage: npm run seed   (from backend/)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Admin user --------------------------------------------------
    const username = 'administrator';
    const plainPassword = 'Admin123';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const existingUser = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length === 0) {
      await client.query(
        `INSERT INTO users (role, username, password_hash, nama, email, is_locked)
         VALUES ('Admin', $1, $2, $3, $4, false)`,
        [username, passwordHash, 'Administrator', 'admin@example.com']
      );
      console.log(`[seed] created admin user "${username}" / "${plainPassword}"`);
    } else {
      await client.query('UPDATE users SET password_hash = $1 WHERE username = $2', [passwordHash, username]);
      console.log(`[seed] admin user "${username}" already exists - password reset to "${plainPassword}"`);
    }

    // --- Kategori ------------------------------------------------------
    const kategoriSeed = [
      { kode: 'PK', nama: 'Perlengkapan Kantor', subNama: 'Alat Tulis', batasHarga: 500000 },
      { kode: 'EL', nama: 'Elektronik', subNama: 'Perangkat Komputer', batasHarga: 15000000 },
      { kode: 'KB', nama: 'Kebersihan', subNama: 'Peralatan Kebersihan', batasHarga: 3000000 },
      { kode: 'KM', nama: 'Konsumsi', subNama: 'Makanan dan Minuman', batasHarga: 5000000 },
    ];

    for (const item of kategoriSeed) {
      const kategoriRes = await client.query('SELECT id FROM kategori WHERE kode = $1', [item.kode]);
      let kategoriId;
      if (kategoriRes.rows.length === 0) {
        const inserted = await client.query(
          'INSERT INTO kategori (kode, nama) VALUES ($1, $2) RETURNING id',
          [item.kode, item.nama]
        );
        kategoriId = inserted.rows[0].id;
        console.log(`[seed] created kategori "${item.kode} - ${item.nama}"`);
      } else {
        kategoriId = kategoriRes.rows[0].id;
        console.log(`[seed] kategori "${item.kode}" already exists`);
      }

      const subRes = await client.query(
        'SELECT id FROM sub_kategori WHERE kategori_id = $1 AND nama = $2',
        [kategoriId, item.subNama]
      );
      if (subRes.rows.length === 0) {
        await client.query(
          'INSERT INTO sub_kategori (kategori_id, nama, batas_harga) VALUES ($1, $2, $3)',
          [kategoriId, item.subNama, item.batasHarga]
        );
        console.log(`[seed] created sub kategori "${item.subNama}" (batas harga ${item.batasHarga})`);
      } else {
        console.log(`[seed] sub kategori "${item.subNama}" already exists`);
      }
    }

    await client.query('COMMIT');
    console.log('[seed] done.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
