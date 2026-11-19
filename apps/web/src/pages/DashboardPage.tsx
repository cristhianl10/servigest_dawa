import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DashboardOverview, MySummary, Priority, RequestStatus } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorBlock, LoadingBlock } from '../components/Feedback';
import { Card, PageHeader, StatCard } from '../components/Ui';
import { api } from '../lib/api';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  monthRange,
  priorityTone,
  statusTone,
} from '../lib/utils';

type DashboardData = DashboardOverview | MySummary;

function isOverview(data: DashboardData): data is DashboardOverview {
  return 'technicianLoad' in data;
}

export function DashboardPage() {
  const { user } = useAuth();
  const defaults = useMemo(monthRange, []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const isGlobal = user?.role === 'ADMIN' || user?.role === 'COORDINADOR';
  const endpoint = isGlobal ? '/dashboard/indicadores' : '/dashboard/mi-resumen';

  const query = useQuery({
    queryKey: ['dashboard', endpoint, from, to],
    queryFn: () => api.get<DashboardData>(`${endpoint}?from=${from}&to=${to}`),
    enabled: Boolean(from && to),
  });

  const data = query.data;
  const total = data?.byStatus.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const maxStatus = Math.max(1, ...(data?.byStatus.map((item) => item.count) ?? [1]));
  const maxPriority = Math.max(1, ...(data?.byPriority.map((item) => item.count) ?? [1]));
  const maxEvolution = Math.max(
    1,
    ...(data && isOverview(data)
      ? data.evolution.map((item) => Math.max(item.created, item.resolved))
      : [1])
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow={isGlobal ? 'Operación global' : 'Mi actividad'}
        title="Dashboard"
        description={
          isGlobal
            ? 'Indicadores del servicio en el rango seleccionado.'
            : 'Resumen de las solicitudes vinculadas a tu cuenta.'
        }
        actions={
          <div className="date-range">
            <label>
              <span>Desde</span>
              <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              <span>Hasta</span>
              <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
            </label>
          </div>
        }
      />

      {query.isLoading && <LoadingBlock label="Calculando indicadores…" />}
      {query.isError && <ErrorBlock error={query.error} onRetry={() => void query.refetch()} />}

      {data && (
        <>
          <div className="stat-grid">
            <StatCard label="Solicitudes del rango" value={total} hint="Creadas en el período" tone="brand" />
            <StatCard
              label="Tiempo promedio"
              value={`${data.avgResolutionHours.toFixed(1)} h`}
              hint="Resolución, descontando pausas"
            />
            <StatCard
              label="Cumplimiento SLA"
              value={`${data.slaCompliance.percentage.toFixed(1)}%`}
              hint={`${data.slaCompliance.within} de ${data.slaCompliance.total} resueltas a tiempo`}
              tone={data.slaCompliance.percentage >= 90 ? 'success' : 'danger'}
            />
            <StatCard
              label="Vencidas abiertas"
              value={data.overdue}
              hint="Requieren atención inmediata"
              tone={data.overdue > 0 ? 'danger' : 'success'}
            />
          </div>

          {total === 0 && data.overdue === 0 ? (
            <EmptyState
              title="Sin actividad en el rango"
              message="Cambia las fechas o registra una nueva solicitud para comenzar."
            />
          ) : (
            <>
              <div className="grid grid-2 dashboard-grid">
                <Card>
                  <div className="card-heading">
                    <h2>Distribución por estado</h2>
                    <p>Solicitudes creadas en el período.</p>
                  </div>
                  <div className="bar-list">
                    {data.byStatus.length === 0 && <p className="muted">Sin datos.</p>}
                    {data.byStatus.map((item) => (
                      <div className="bar-row" key={item.status}>
                        <div className="bar-label">
                          <span className={`badge ${statusTone(item.status as RequestStatus)}`}>
                            {STATUS_LABELS[item.status as RequestStatus]}
                          </span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="bar-track">
                          <span
                            className={`bar-fill ${statusTone(item.status as RequestStatus)}`}
                            style={{ width: `${(item.count / maxStatus) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <div className="card-heading">
                    <h2>Distribución por prioridad</h2>
                    <p>Volumen según criticidad declarada.</p>
                  </div>
                  <div className="bar-list">
                    {data.byPriority.length === 0 && <p className="muted">Sin datos.</p>}
                    {data.byPriority.map((item) => (
                      <div className="bar-row" key={item.priority}>
                        <div className="bar-label">
                          <span className={`badge ${priorityTone(item.priority as Priority)}`}>
                            {PRIORITY_LABELS[item.priority as Priority]}
                          </span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="bar-track">
                          <span
                            className={`bar-fill ${priorityTone(item.priority as Priority)}`}
                            style={{ width: `${(item.count / maxPriority) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {isOverview(data) && (
                <>
                                <Card>
                  <div className="card-heading">
                    <h2>Evolución del rango</h2>
                    <p>Creadas vs. resueltas por período.</p>
                  </div>
                  <div className="chart-legend">
                    <span><i className="legend-created" /> Creadas</span>
                    <span><i className="legend-resolved" /> Resueltas</span>
                  </div>
                  <div className="evolution-chart" role="img" aria-label="Gráfico de evolución">
                    {data.evolution.map((point) => (
                      <div className="evolution-column" key={point.date}>
                        <div className="evolution-bars">
                          <span
                            className="evolution-bar created"
                            style={{ height: `${(point.created / maxEvolution) * 100}%` }}
                            title={`${point.created} creadas`}
                          />
                          <span
                            className="evolution-bar resolved"
                            style={{ height: `${(point.resolved / maxEvolution) * 100}%` }}
                            title={`${point.resolved} resueltas`}
                          />
                        </div>
                        <small>{point.date.slice(5).replace('-', '/')}</small>
                      </div>
                    ))}
                  </div>
                </Card>
  
  
                <Card>
                  <div className="card-heading">
                    <h2>Carga de técnicos</h2>
                    <p>Asignaciones vigentes frente a la capacidad máxima.</p>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Técnico</th>
                          <th>Carga</th>
                          <th>Capacidad</th>
                          <th>Ocupación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.technicianLoad.length === 0 && (
                          <tr><td colSpan={4} className="muted">Sin técnicos registrados.</td></tr>
                        )}
                        {data.technicianLoad.map((tech) => {
                          const ratio = tech.capacity > 0 ? tech.active / tech.capacity : 0;
                          return (
                            <tr key={tech.technicianId}>
                              <td><strong>{tech.fullName}</strong></td>
                              <td>{tech.active}</td>
                              <td>{tech.capacity}</td>
                              <td>
                                <div className="capacity-cell">
                                  <div className="bar-track">
                                    <span
                                      className={`bar-fill ${ratio >= 0.9 ? 'danger' : ratio >= 0.7 ? 'warning' : 'success'}`}
                                      style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                                    />
                                  </div>
                                  <span>{Math.round(ratio * 100)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
