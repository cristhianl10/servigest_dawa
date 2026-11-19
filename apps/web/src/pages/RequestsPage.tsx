import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PRIORITIES, REQUEST_STATUSES, type Priority, type RequestStatus } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorBlock, LoadingBlock } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { PageHeader, Pagination, PriorityBadge, StatusBadge } from '../components/Ui';
import { api } from '../lib/api';
import type { ListResponse, RequestSummary } from '../lib/types';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDateTime,
} from '../lib/utils';

export function RequestsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(1);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '15');
    if (deferredSearch.trim()) params.set('search', deferredSearch.trim());
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (overdue) params.set('overdue', 'true');
    params.set('sort', '-createdAt');
    return params.toString();
  }, [page, deferredSearch, status, priority, overdue]);

  const query = useQuery({
    queryKey: ['requests', queryString],
    queryFn: () => api.list<RequestSummary>(`/solicitudes?${queryString}`),
  });

  const canCreate = user?.role === 'CLIENTE' || user?.role === 'COORDINADOR' || user?.role === 'ADMIN';
  const response: ListResponse<RequestSummary> | undefined = query.data;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Operación"
        title="Solicitudes"
        description="Consulta, filtra y da seguimiento a los casos registrados."
        actions={
          canCreate ? (
            <Link to="/solicitudes/nueva" className="btn btn-primary">
              <Icon name="plus" size={16} /> Nueva solicitud
            </Link>
          ) : undefined
        }
      />

      <div className="filter-bar">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Buscar por código o descripción…"
            aria-label="Buscar solicitudes"
          />
        </label>

        <label className="compact-field">
          <span>Estado</span>
          <select
            value={status}
            onChange={(event) => { setStatus(event.target.value as RequestStatus | ''); setPage(1); }}
          >
            <option value="">Todos</option>
            {REQUEST_STATUSES.map((item) => (
              <option key={item} value={item}>{STATUS_LABELS[item]}</option>
            ))}
          </select>
        </label>

        <label className="compact-field">
          <span>Prioridad</span>
          <select
            value={priority}
            onChange={(event) => { setPriority(event.target.value as Priority | ''); setPage(1); }}
          >
            <option value="">Todas</option>
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>{PRIORITY_LABELS[item]}</option>
            ))}
          </select>
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(event) => { setOverdue(event.target.checked); setPage(1); }}
          />
          <span>Solo vencidas</span>
        </label>
      </div>

      {query.isLoading && <LoadingBlock label="Cargando solicitudes…" />}
      {query.isError && <ErrorBlock error={query.error} onRetry={() => void query.refetch()} />}

      {response && (
        <>
          {response.data.length === 0 ? (
            <EmptyState
              title="No hay solicitudes"
              message="Prueba con otros filtros o registra una solicitud nueva."
            />
          ) : (
            <div className="card table-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Cliente / sede</th>
                      <th>Categoría</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                      <th>Responsable</th>
                      <th>Vence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {response.data.map((request) => (
                      <tr key={request.id} className={request.isOverdue ? 'row-overdue' : undefined}>
                        <td>
                          <Link to={`/solicitudes/${request.id}`} className="code-link">
                            {request.code}
                          </Link>
                          <div className="cell-sub">{formatDateTime(request.createdAt)}</div>
                        </td>
                        <td>
                          <strong>{request.client?.businessName ?? '—'}</strong>
                          <div className="cell-sub">{request.site?.name ?? '—'}</div>
                        </td>
                        <td>{request.category?.name ?? '—'}</td>
                        <td><PriorityBadge priority={request.priority} /></td>
                        <td><StatusBadge status={request.status} /></td>
                        <td>{request.assignedTechnician?.fullName ?? <span className="muted">Sin asignar</span>}</td>
                        <td>
                          <span className={request.isOverdue ? 'text-danger' : undefined}>
                            {formatDateTime(request.dueAt)}
                          </span>
                          {request.isOverdue && <div className="cell-sub text-danger">Vencida</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={response.meta.totalPages} onChange={setPage} />
            </div>
          )}
          <p className="list-summary">{response.meta.total} solicitudes encontradas</p>
        </>
      )}
    </div>
  );
}
