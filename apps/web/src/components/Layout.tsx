import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { ROLE_LABELS, cn } from '../lib/utils';
import { Icon, type IconName } from './Icon';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/solicitudes', label: 'Solicitudes', icon: 'ticket' },
  { to: '/solicitudes/nueva', label: 'Nueva solicitud', icon: 'plus', roles: ['CLIENTE', 'COORDINADOR', 'ADMIN'] },
  { to: '/notificaciones', label: 'Notificaciones', icon: 'bell' },
  { to: '/admin/usuarios', label: 'Usuarios', icon: 'users', roles: ['ADMIN'] },
  { to: '/admin/clientes', label: 'Clientes', icon: 'building', roles: ['ADMIN', 'COORDINADOR'] },
  { to: '/admin/tecnicos', label: 'Técnicos', icon: 'wrench', roles: ['ADMIN', 'COORDINADOR'] },
  { to: '/admin/catalogos', label: 'Catálogos', icon: 'book', roles: ['ADMIN', 'COORDINADOR'] },
  { to: '/perfil', label: 'Mi perfil', icon: 'user' },
];

const TITLES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/dashboard/, title: 'Dashboard' },
  { match: /^\/solicitudes\/nueva/, title: 'Nueva solicitud' },
  { match: /^\/solicitudes\/[^/]+/, title: 'Detalle de solicitud' },
  { match: /^\/solicitudes/, title: 'Solicitudes' },
  { match: /^\/notificaciones/, title: 'Notificaciones' },
  { match: /^\/admin\/usuarios/, title: 'Usuarios' },
  { match: /^\/admin\/clientes/, title: 'Clientes y sedes' },
  { match: /^\/admin\/tecnicos/, title: 'Técnicos' },
  { match: /^\/admin\/catalogos/, title: 'Catálogos y parámetros' },
  { match: /^\/perfil/, title: 'Mi perfil' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount, connected } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const title = TITLES.find((item) => item.match.test(location.pathname))?.title ?? 'ServiGest';
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={cn('sidebar', menuOpen && 'sidebar-open')}>
        <div className="brand">
          <span className="brand-mark">SG</span>
          <div>
            <strong>ServiGest</strong>
            <small>Ecuador</small>
          </div>
        </div>

        <nav className="nav" aria-label="Navegación principal">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/solicitudes'}
              className={({ isActive }) => cn('nav-link', isActive && 'active')}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.to === '/notificaciones' && unreadCount > 0 && (
                <span className="nav-badge" aria-label={`${unreadCount} sin leer`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="connection">
            <span className={cn('dot', connected ? 'dot-online' : 'dot-offline')} />
            {connected ? 'Notificaciones en vivo' : 'Reconectando…'}
          </div>
          <button type="button" className="nav-link logout" onClick={handleLogout}>
            <Icon name="logout" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="main-column">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" />
          </button>
          <h2>{title}</h2>
          <div className="topbar-user">
            <span className="avatar" aria-hidden="true">
              {user.fullName
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </span>
            <div className="topbar-user-info">
              <strong>{user.fullName}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
        </header>

        {user.mustChangePassword && (
          <div className="banner banner-warning" role="status">
            Debes cambiar tu contraseña temporal antes de continuar.{' '}
            <NavLink to="/perfil">Ir a mi perfil</NavLink>
          </div>
        )}

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
