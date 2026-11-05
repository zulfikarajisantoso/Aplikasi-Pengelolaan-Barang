import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username wajib diisi.');
      return;
    }
    if (!password) {
      setError('Password wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/barang-masuk');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal login. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="sidebar-brand-icon">&#9671;</span>
          <h1>Aplikasi Pengelolaan Barang</h1>
        </div>
        <p className="login-subtitle">Silakan masuk untuk melanjutkan</p>

        {error && <div className="alert alert-error">{error}</div>}

        <label className="field">
          <span>Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Masukkan username"
            autoFocus
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Memproses...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
