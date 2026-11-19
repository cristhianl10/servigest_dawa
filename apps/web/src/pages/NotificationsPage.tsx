import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { Card, PageHeader, Pagination } from '../components/Ui';
import { api } from '../lib/api';
import type { NotificationItem } from '../lib/types';
import { cn, errorMessage, formatDateTime } from '../lib/utils';

const TYPE_LABELS: Record<string, string> = {
  SOLICITUD_CREADA: 'Nueva solicitud',
  ASIGNACION: 'Asignación',
  CAMBIO_ESTADO: 'Cambio de estado',
  COMENTARIO: 'Comentario',
  SLA_POR_VENCER: 'SLA por vencer',
  SLA_VENCIDO: 'SLA vencido',
  REAPERTURA: 'Reapertura',
};

export function NotificationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const query = useQuery({
    queryKey: ['notifications', 'page', page, unreadOnly],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (unreadOnly) params.set('unread', 'true');
      return api.list<NotificationItem>(`/notificaciones?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markRead = async (notification: NotificationItem) => {
    if (notification.read) return;
    try {
      await api.patch(`/notificaciones/${notification.id}/leida`, {});
      invalidate();
    } catch (err) {
      toast.error('No se pudo marcar como leída', errorMessage(err));
    }
  };

  const markAll = async () => {
    try {
      await api.post('/notificaciones/leer-todas', {});
      toast.success('Notificaciones marcadas como leídas');
      invalidate();
    } catch (err) {
      toast.error('No se pudieron actualizar las notificaciones', errorMessage(err));
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Bandeja"
        title="Notificaciones"
        description="Eventos de tus solicitudes y asignaciones, en tiempo real."
        actions={
          <div className="action-bar">
            <label className="toggle">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => {
                  setUnreadOnly(event.target.checked);
                  setPage(1);
                }}
              />
              <span>Solo no leídas</span>
            </label>
            <button type="button" className="btn btn-ghost" onClick={() => void markAll()}>
              Marcar todas como leídas
            </button>
          </div>
        }
      />

      <Card>
        {query.isLoading && <LoadingBlock label="Cargando notificaciones…" />}
        {query.isError && <ErrorBlock error={query.error} onRetry={() => void query.refetch()} />}
        {query.data && query.data.data.length === 0 && (
          <EmptyBlock
            title="Bandeja al día"
            description={unreadOnly ? 'No tienes notificaciones pendientes.' : 'Aún no has recibido notificaciones.'}
          />
        )}
        {query.data && query.data.data.length > 0 && (
          <ul className="notification-list">
            {query.data.data.map((notification) => (
              <li
                key={notification.id}
                className={cn('notification-item', !notification.read && 'unread')}
              >
                <span className="notification-bell"><Icon name="bell" size={17} /></span>
                <div className="notification-body">
                  <div className="notification-head">
                    <strong>{notification.title}</strong>
                    <span className="badge neutral">
                      {TYPE_LABELS[notification.type] ?? notification.type}
                    </span>
                  </div>
                  <p>{notification.body}</p>
                  <small>{formatDateTime(notification.createdAt)}</small>
                  <div className="notification-actions">
                    {notification.requestId && (
                      <Link to={`/solicitudes/${notification.requestId}`} className="link">
                        Ver solicitud
                      </Link>
                    )}
                    {!notification.read && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => void markRead(notification)}
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {query.data && (
          <Pagination
            page={query.data.meta.page}
            totalPages={query.data.meta.totalPages}
            onChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
