import type { ReactNode } from 'react';
import type { Priority, RequestStatus } from '@servigest/shared';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  cn,
  priorityTone,
  statusTone,
} from '../lib/utils';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={cn('badge', tone)}>{children}</span>;
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={statusTone(status)}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priorityTone(priority)}>{PRIORITY_LABELS[priority]}</Badge>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn('card', className)}>{children}</section>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'danger' | 'success' | 'brand';
}) {
  return (
    <div className={cn('stat-card', `stat-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Paginación">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}
