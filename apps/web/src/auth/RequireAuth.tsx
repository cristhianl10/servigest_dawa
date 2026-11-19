import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@servigest/shared';
import { useAuth } from './AuthContext';
import { Icon } from '../components/Icon';
import { FullPageSpinner } from '../components/Feedback';

export function RequireAuth({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner label="Restaurando sesión…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true"><Icon name="shield" size={26} /></span>
          <h1>Acceso restringido</h1>
          <p>Tu rol no tiene permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
