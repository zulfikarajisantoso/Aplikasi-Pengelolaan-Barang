import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import BarangMasukList from './pages/BarangMasukList';
import BarangMasukForm from './pages/BarangMasukForm';
import BarangMasukPrint from './pages/BarangMasukPrint';
import Kategori from './pages/Kategori';
import SubKategori from './pages/SubKategori';
import Users from './pages/Users';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/barang-masuk"
        element={
          <ProtectedRoute>
            <BarangMasukList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barang-masuk/baru"
        element={
          <ProtectedRoute>
            <BarangMasukForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barang-masuk/:id/edit"
        element={
          <ProtectedRoute>
            <BarangMasukForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barang-masuk/:id/print"
        element={
          <ProtectedRoute>
            <BarangMasukPrint />
          </ProtectedRoute>
        }
      />

      <Route
        path="/master/kategori"
        element={
          <ProtectedRoute roles={['Admin']}>
            <Kategori />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/sub-kategori"
        element={
          <ProtectedRoute roles={['Admin']}>
            <SubKategori />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['Admin']}>
            <Users />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/barang-masuk" replace />} />
      <Route path="*" element={<Navigate to="/barang-masuk" replace />} />
    </Routes>
  );
}
