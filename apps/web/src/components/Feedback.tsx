import type { ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { Icon, type IconName } from './Icon';

export function FullPageSpinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="full-page-center" role="status" aria-live="polite">
      <span className="spinner spinner-lg" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function LoadingBlock({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  return (
    <div className="alert alert-error" role="alert">
      <div>
        <strong>{apiError?.message ?? 'No fue posible cargar la información.'}</strong>
        {apiError?.requestId && (
          <div className="alert-meta">Referencia: {apiError.requestId}</div>
        )}
      </div>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry} type="button">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon = 'ticket',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true"><Icon name={icon} size={26} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function EmptyBlock({
  title,
  description,
  icon = 'ticket',
}: {
  title: string;
  description: string;
  icon?: IconName;
}) {
  return <EmptyState icon={icon} title={title} message={description} />;
}
