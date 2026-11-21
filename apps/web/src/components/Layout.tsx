import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { ROLE_LABELS, cn } from '../lib/utils';
import { Icon, type IconName } from './Icon';

type NavSection = 'Operación' | 'Bandeja' | 'Administración' | 'Cuenta';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  section: NavSection;
  roles?: Role[];
}

const NAV_SECTIONS: NavSection[] = ['Operación', 'Bandeja', 'Administración', 'Cuenta'];

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Operación' },
  { to: '/solicitudes', label: 'Solicitudes', icon: 'ticket', section: 'Operación' },
  { to: '/solicitudes/nueva', label: 'Nueva solicitud', icon: 'plus', section: 'Operación', roles: ['CLIENTE', 'COORDINADOR', 'ADMIN'] },
  { to: '/notificaciones', label: 'Notificaciones', icon: 'bell', section: 'Bandeja' },
  { to: '/admin/usuarios', label: 'Usuarios', icon: 'users', section: 'Administración', roles: ['ADMIN'] },
  { to: '/admin/clientes', label: 'Clientes', icon: 'building', section: 'Administración', roles: ['ADMIN', 'COORDINADOR'] },
  { to: '/admin/tecnicos', label: 'Técnicos', icon: 'wrench', section: 'Administración', roles: ['ADMIN', 'COORDINADOR'] },
  { to: '/admin/catalogos', label: 'Catálogos', icon: 'book', section: 'Administración', roles: ['ADMIN', 'COORDINADOR'] },
  { to: '/perfil', label: 'Mi perfil', icon: 'user', section: 'Cuenta' },
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
  const groups = NAV_SECTIONS.map((section, index) => ({
    section,
    index,
    items: items.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0);
  const today = new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

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
            <small>Bitácora de servicio</small>
          </div>
        </div>

        <nav className="nav" aria-label="Navegación principal">
          {groups.map((group) => (
            <div className="nav-group" key={group.section}>
              <span className="nav-group-label">
                <span>{String(group.index + 1).padStart(2, '0')}</span>
                {group.section}
              </span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/solicitudes'}
                  className={({ isActive }) => cn('nav-link', isActive && 'active')}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="nav-index" aria-hidden="true">
                    {String(items.indexOf(item) + 1).padStart(2, '0')}
                  </span>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.to === '/notificaciones' && unreadCount > 0 && (
                    <span className="nav-badge" aria-label={`${unreadCount} sin leer`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-note">
            Servicio técnico
            <span>Guayaquil · Ecuador</span>
          </div>
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
          <div className="topbar-doc">
            <h2>{title}</h2>
            <span className="topbar-folio">Registro operativo · {today}</span>
          </div>
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
          <button type="button" className="topbar-logout" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            <span>Cerrar sesión</span>
          </button>
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
