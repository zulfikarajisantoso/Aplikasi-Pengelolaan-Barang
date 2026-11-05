-- Aplikasi Pengelolaan Barang - initial schema
-- Run with: psql $DATABASE_URL -f backend/migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- users
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role          text NOT NULL CHECK (role IN ('Admin', 'Operator')),
  username      text NOT NULL UNIQUE CHECK (char_length(username) BETWEEN 8 AND 100),
  password_hash text NOT NULL,
  nama          text NOT NULL CHECK (char_length(nama) BETWEEN 8 AND 100),
  email         text NOT NULL CHECK (char_length(email) BETWEEN 8 AND 100)
                      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  is_locked     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- kategori
-- =========================================================
CREATE TABLE IF NOT EXISTS kategori (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode       text NOT NULL UNIQUE CHECK (char_length(kode) <= 10),
  nama       text NOT NULL CHECK (char_length(nama) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- sub_kategori
-- =========================================================
CREATE TABLE IF NOT EXISTS sub_kategori (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori_id  uuid NOT NULL REFERENCES kategori(id) ON DELETE RESTRICT,
  nama         text NOT NULL CHECK (char_length(nama) <= 100),
  batas_harga  numeric NOT NULL CHECK (batas_harga >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_kategori_kategori_id ON sub_kategori(kategori_id);

-- =========================================================
-- barang_masuk
-- =========================================================
CREATE TABLE IF NOT EXISTS barang_masuk (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal            date NOT NULL,
  operator_id        uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kategori_id        uuid NOT NULL REFERENCES kategori(id) ON DELETE RESTRICT,
  sub_kategori_id    uuid NOT NULL REFERENCES sub_kategori(id) ON DELETE RESTRICT,
  asal_barang        text NOT NULL CHECK (char_length(asal_barang) <= 200),
  nomor_surat        text CHECK (nomor_surat IS NULL OR char_length(nomor_surat) <= 100),
  lampiran_path      text,
  status_verifikasi  boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barang_masuk_kategori_id ON barang_masuk(kategori_id);
CREATE INDEX IF NOT EXISTS idx_barang_masuk_sub_kategori_id ON barang_masuk(sub_kategori_id);
CREATE INDEX IF NOT EXISTS idx_barang_masuk_operator_id ON barang_masuk(operator_id);
CREATE INDEX IF NOT EXISTS idx_barang_masuk_tanggal ON barang_masuk(tanggal);

-- =========================================================
-- barang_masuk_item
-- =========================================================
CREATE TABLE IF NOT EXISTS barang_masuk_item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barang_masuk_id uuid NOT NULL REFERENCES barang_masuk(id) ON DELETE CASCADE,
  nama_barang     text NOT NULL CHECK (char_length(nama_barang) <= 200),
  harga           numeric NOT NULL CHECK (harga >= 0),
  jumlah          numeric NOT NULL CHECK (jumlah >= 0),
  satuan          text NOT NULL CHECK (char_length(satuan) <= 40),
  total           numeric NOT NULL CHECK (total >= 0),
  tgl_expired     date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barang_masuk_item_barang_masuk_id ON barang_masuk_item(barang_masuk_id);
