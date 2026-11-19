import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true"><Icon name="search" size={26} /></span>
        <span className="eyebrow">Error 404</span>
        <h1>Página no encontrada</h1>
        <p>La dirección que buscas no existe o fue movida.</p>
        <Link to="/dashboard" className="btn btn-primary">Volver al dashboard</Link>
      </div>
    </div>
  );
}
