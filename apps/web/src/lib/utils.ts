import type { Priority, RequestStatus } from '@servigest/shared';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  REGISTRADA: 'Registrada',
  APROBADA: 'Aprobada',
  ASIGNADA: 'Asignada',
  EN_PROCESO: 'En proceso',
  PENDIENTE_INFO: 'Pendiente de información',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  COORDINADOR: 'Coordinador',
  TECNICO: 'Técnico',
  CLIENTE: 'Cliente',
};

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  return { from: toDateInput(first), to: toDateInput(now) };
}

export function statusTone(status: RequestStatus): string {
  return `status-${status.toLowerCase().replace('_', '-')}`;
}

export function priorityTone(priority: Priority): string {
  return `priority-${priority.toLowerCase()}`;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Ocurrió un error inesperado.';
}
