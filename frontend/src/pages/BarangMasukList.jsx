import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, formatDate } from '../utils/format';

export default function BarangMasukList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [kategoriList, setKategoriList] = useState([]);
  const [subKategoriList, setSubKategoriList] = useState([]);
  const [years, setYears] = useState([]);

  const [kategoriFilter, setKategoriFilter] = useState('');
  const [subKategoriFilter, setSubKategoriFilter] = useState('');
  const [tahunFilter, setTahunFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortDir, setSortDir] = useState('desc');

  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  useEffect(() => {
    api.get('/kategori', { params: { all: 1 } }).then((res) => setKategoriList(res.data.data));
    api.get('/barang-masuk/years').then((res) => setYears(res.data.data));
  }, []);

  useEffect(() => {
    if (!kategoriFilter) {
      setSubKategoriList([]);
      setSubKategoriFilter('');
      return;
    }
    api.get('/sub-kategori', { params: { all: 1, kategoriId: kategoriFilter } }).then((res) => setSubKategoriList(res.data.data));
  }, [kategoriFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await api.get('/barang-masuk', {
        params: {
          page,
          pageSize,
          kategoriId: kategoriFilter || undefined,
          subKategoriId: subKategoriFilter || undefined,
          tahun: tahunFilter || undefined,
          search: search || undefined,
          sortBy,
          sortDir,
        },
      });
      
      setRows(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setListError(err.response?.data?.error || 'Gagal memuat data barang masuk.');
    } finally {
      setLoading(false);
    }
  }, [page, kategoriFilter, subKategoriFilter, tahunFilter, search, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function toggleSort(col) {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  function sortIndicator(col) {
    if (sortBy !== col) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  async function handleVerifikasi(row) {
    try {
      await api.patch(`/barang-masuk/${row.id}/verifikasi`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah status verifikasi.');
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Hapus data barang masuk dari "${row.asal_barang}"?`)) return;
    try {
      await api.delete(`/barang-masuk/${row.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus data.');
    }
  }

  function handleExport() {
    const params = new URLSearchParams({
      ...(kategoriFilter ? { kategoriId: kategoriFilter } : {}),
      ...(subKategoriFilter ? { subKategoriId: subKategoriFilter } : {}),
      ...(tahunFilter ? { tahun: tahunFilter } : {}),
      ...(search ? { search } : {}),
      sortBy,
      sortDir,
    });
    const token = localStorage.getItem('token');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    // Use fetch so we can attach the Authorization header, then trigger a download.
    fetch(`${baseURL}/barang-masuk/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export gagal');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'barang-masuk.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => alert('Gagal mengekspor data ke Excel.'));
  }

  const verifiedCount = rows.filter((row) => row.status_verifikasi).length;
  const visibleTotal = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  return (
    <Layout>
      <div className="page-intro">
        <div>
          <span className="eyebrow">INVENTORY WORKSPACE</span>
          <h2>Barang Masuk</h2>
          <p>Pantau penerimaan dan detail inventaris dalam satu tampilan.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-export" onClick={handleExport} title="Export data ke Excel">
            <span className="export-icon" aria-hidden="true">▦</span>
            <span>Export Excel</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/barang-masuk/baru')}>
            + Tambah Barang Masuk
          </button>
        </div>
      </div>

      <div className="inventory-stats" aria-label="Ringkasan inventaris">
        <div className="stat-card"><span>Data ditampilkan</span><strong>{rows.length}</strong><small>dari {total} penerimaan</small></div>
        <div className="stat-card"><span>Terverifikasi</span><strong>{verifiedCount}</strong><small>penerimaan aktif</small></div>
        <div className="stat-card stat-card-accent"><span>Nilai halaman ini</span><strong>Rp {formatRupiah(visibleTotal)}</strong><small>total barang masuk</small></div>
      </div>

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <select value={kategoriFilter} onChange={(e) => { setKategoriFilter(e.target.value); setPage(1); }}>
          <option value="">Semua Kategori</option>
          {kategoriList.map((k) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
        <select
          value={subKategoriFilter}
          onChange={(e) => { setSubKategoriFilter(e.target.value); setPage(1); }}
          disabled={!kategoriFilter}
        >
          <option value="">Semua Sub Kategori</option>
          {subKategoriList.map((sk) => (
            <option key={sk.id} value={sk.id}>{sk.nama}</option>
          ))}
        </select>
        <select value={tahunFilter} onChange={(e) => { setTahunFilter(e.target.value); setPage(1); }}>
          <option value="">Semua Tahun</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Cari asal barang / sub kategori..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">Cari</button>
      </form>

      {listError && <div className="alert alert-error">{listError}</div>}

      <div className="table-wrap">
        <table className="data-table bm-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('tanggal')}>Tanggal{sortIndicator('tanggal')}</th>
              <th className="sortable" onClick={() => toggleSort('asal_barang')}>Asal Barang{sortIndicator('asal_barang')}</th>
              <th>Sub Kategori</th>
              <th>Kode</th>
              <th>Nama</th>
              <th>Harga</th>
              <th>Jumlah</th>
              <th className="sortable" onClick={() => toggleSort('total')}>Total{sortIndicator('total')}</th>
              <th style={{ width: 150 }}>Aksi</th>
              <th>Status Verifikasi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="empty-cell">Memuat...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={10} className="empty-cell">Belum ada data barang masuk.</td></tr>
            )}
            {!loading && rows.flatMap((row, rowIndex) => {
              const items = row.items.length ? row.items : [{ id: `${row.id}-empty`, nama_barang: '-', harga: 0, jumlah: 0, total: 0 }];
              return items.map((item, itemIndex) => ({ row, item, itemIndex, itemCount: items.length, rowIndex }));
            }).map(({ row, item, itemIndex, itemCount, rowIndex }) => (
              <tr className={`${itemIndex > 0 ? 'item-continuation-row ' : 'barang-group-start '}${rowIndex % 2 ? 'barang-group-muted ' : ''}${itemIndex === itemCount - 1 ? 'barang-group-end' : ''}`} key={`${row.id}-${item.id}`}>
                <td>{itemIndex === 0 ? formatDate(row.tanggal) : ''}</td>
                <td>{itemIndex === 0 ? row.asal_barang : ''}</td>
                <td>{itemIndex === 0 ? row.sub_kategori_nama : ''}</td>
                <td>{itemIndex === 0 ? row.kategori_kode : ''}</td>
                <td>{item.nama_barang}</td>
                <td className="text-right">Rp {formatRupiah(item.harga)}</td>
                <td>{item.jumlah}</td>
                <td className="text-right"><strong>Rp {formatRupiah(item.total)}</strong></td>
                <td className="action-cell">
                  {itemIndex === 0 && (
                    <>
                      <Link className="icon-btn" to={`/barang-masuk/${row.id}/edit`} title="Edit" aria-label="Edit data">✎</Link>
                      <Link className="icon-btn" to={`/barang-masuk/${row.id}/print`} target="_blank" title="Cetak surat masuk" aria-label="Cetak surat masuk">⎙</Link>
                      {(user.role === 'Admin' || row.operator_id === user.id) && (
                        <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleDelete(row)} title="Hapus" aria-label="Hapus data">×</button>
                      )}
                    </>
                  )}
                </td>
                <td>
                  {itemIndex === 0 && (
                    <button
                      type="button"
                      className={`verify-toggle ${row.status_verifikasi ? 'verified' : ''}`}
                      onClick={() => handleVerifikasi(row)}
                      title={row.status_verifikasi ? 'Terverifikasi' : 'Belum terverifikasi'}
                      aria-label={row.status_verifikasi ? 'Terverifikasi' : 'Belum terverifikasi'}
                    >
                      <span className="verify-icon" aria-hidden="true">✓</span>
                      <span>{row.status_verifikasi ? 'Terverifikasi' : 'Belum'}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
    </Layout>
  );
}
