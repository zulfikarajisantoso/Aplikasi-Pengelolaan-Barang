import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [masterOpen, setMasterOpen] = useState(true);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isAdmin = user?.role === 'Admin';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">&#9671;</span>
          <span>Aplikasi Pengelolaan Barang</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/barang-masuk" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Barang Masuk
          </NavLink>

          {isAdmin && (
            <div className="nav-group">
              <button type="button" className="nav-item nav-group-toggle" onClick={() => setMasterOpen((v) => !v)}>
                Master Data
                <span className={`chevron ${masterOpen ? 'open' : ''}`}>&#9656;</span>
              </button>
              {masterOpen && (
                <div className="nav-subitems">
                  <NavLink to="/master/kategori" className={({ isActive }) => (isActive ? 'nav-subitem active' : 'nav-subitem')}>
                    Kategori
                  </NavLink>
                  <NavLink to="/master/sub-kategori" className={({ isActive }) => (isActive ? 'nav-subitem active' : 'nav-subitem')}>
                    Sub Kategori
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {isAdmin && (
            <NavLink to="/users" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              Manajemen User
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-spacer" />
          <div className="topbar-user">
            <div className="topbar-user-info">
              <span className="topbar-user-name">{user?.nama}</span>
              <span className="topbar-user-role">{user?.role}</span>
            </div>
            <button type="button" className="btn btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
