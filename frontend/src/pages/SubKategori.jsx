import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import api from '../api/axios';
import { formatRupiah, parseRupiah } from '../utils/format';

const emptyForm = { kategoriId: '', nama: '', batasHarga: '' };

export default function SubKategori() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kategoriList, setKategoriList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');

  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await api.get('/sub-kategori', { params: { page, pageSize, search } });
      setRows(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setListError(err.response?.data?.error || 'Gagal memuat data sub kategori.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get('/kategori', { params: { all: 1 } }).then((res) => setKategoriList(res.data.data));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({ kategoriId: row.kategori_id, nama: row.nama, batasHarga: String(Math.trunc(Number(row.batas_harga))) });
    setFormError('');
    setShowModal(true);
  }

  function validate() {
    if (!form.kategoriId) return 'Kategori wajib dipilih.';
    if (!form.nama.trim()) return 'Nama sub kategori wajib diisi.';
    if (form.nama.length > 100) return 'Nama sub kategori maksimal 100 karakter.';
    if (!form.batasHarga || Number.isNaN(Number(form.batasHarga))) return 'Batas harga wajib diisi dengan angka yang valid.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError('');
    const payload = { ...form, batasHarga: Number(form.batasHarga) };
    try {
      if (editing) {
        await api.put(`/sub-kategori/${editing.id}`, payload);
      } else {
        await api.post('/sub-kategori', payload);
      }
      setShowModal(false);
      load();
    } catch (apiErr) {
      setFormError(apiErr.response?.data?.error || 'Gagal menyimpan sub kategori.');
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Hapus sub kategori "${row.nama}"?`)) return;
    try {
      await api.delete(`/sub-kategori/${row.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus sub kategori.');
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>Master Data - Sub Kategori</h2>
      </div>

      <form className="toolbar toolbar-between" onSubmit={handleSearch}>
        <div className="toolbar-search">
        <input
          type="text"
          placeholder="Cari kategori atau sub kategori..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">Cari</button>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Tambah Sub Kategori
        </button>
      </form>

      {listError && <div className="alert alert-error">{listError}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Nama Sub Kategori</th>
              <th>Batas Harga</th>
              <th style={{ width: 160 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="empty-cell">Memuat...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={4} className="empty-cell">Belum ada data sub kategori.</td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.id}>
                <td>{row.kategori_kode} - {row.kategori_nama}</td>
                <td>{row.nama}</td>
                <td>Rp {formatRupiah(row.batas_harga)}</td>
                <td className="action-cell">
                  <button type="button" className="icon-btn" onClick={() => openEdit(row)} title="Edit sub kategori" aria-label="Edit sub kategori">✎</button>
                  <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleDelete(row)} title="Hapus sub kategori" aria-label="Hapus sub kategori">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />

      {showModal && (
        <Modal title={editing ? 'Edit Sub Kategori' : 'Tambah Sub Kategori'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert alert-error">{formError}</div>}
            <label className="field">
              <span>Kategori</span>
              <select
                required
                value={form.kategoriId}
                onChange={(e) => setForm({ ...form, kategoriId: e.target.value })}
              >
                <option value="">-- Pilih Kategori --</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Nama Sub Kategori</span>
              <input
                type="text"
                required
                maxLength={100}
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Batas Harga</span>
              <input
                type="text"
                required
                inputMode="numeric"
                value={formatRupiah(form.batasHarga)}
                onChange={(e) => setForm({ ...form, batasHarga: parseRupiah(e.target.value) })}
                placeholder="500.000"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary">Simpan</button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
