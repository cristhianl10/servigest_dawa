import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TransitionAction } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { ErrorBlock, LoadingBlock } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { Card, Modal, PageHeader, PriorityBadge, StatusBadge } from '../components/Ui';
import { api, apiDownload } from '../lib/api';
import type { Attachment, RequestDetail, Technician } from '../lib/types';
import {
  STATUS_LABELS,
  errorMessage,
  formatBytes,
  formatDateTime,
} from '../lib/utils';

interface ActionOption {
  action: TransitionAction | 'asignar' | 'reapertura';
  label: string;
  field?: 'comment' | 'reason' | 'resolution';
  minLength?: number;
  tone?: 'primary' | 'danger' | 'ghost';
}

const ACTION_RULES: Record<string, ActionOption[]> = {
  REGISTRADA: [
    { action: 'aprobar', label: 'Aprobar', tone: 'primary' },
    { action: 'cancelar', label: 'Cancelar', field: 'reason', minLength: 10, tone: 'danger' },
  ],
  APROBADA: [
    { action: 'asignar', label: 'Asignar técnico', tone: 'primary' },
    { action: 'cancelar', label: 'Cancelar', field: 'reason', minLength: 10, tone: 'danger' },
  ],
  ASIGNADA: [
    { action: 'iniciar', label: 'Iniciar trabajo', tone: 'primary' },
    { action: 'asignar', label: 'Reasignar', tone: 'ghost' },
    { action: 'solicitar_info', label: 'Solicitar información', field: 'comment', minLength: 10 },
    { action: 'cancelar', label: 'Cancelar', field: 'reason', minLength: 10, tone: 'danger' },
  ],
  EN_PROCESO: [
    { action: 'resolver', label: 'Resolver', field: 'resolution', minLength: 30, tone: 'primary' },
    { action: 'solicitar_info', label: 'Solicitar información', field: 'comment', minLength: 10 },
    { action: 'cancelar', label: 'Cancelar', field: 'reason', minLength: 10, tone: 'danger' },
  ],
  PENDIENTE_INFO: [
    { action: 'reanudar', label: 'Reanudar trabajo', tone: 'primary' },
    { action: 'cancelar', label: 'Cancelar', field: 'reason', minLength: 10, tone: 'danger' },
  ],
  RESUELTA: [
    { action: 'cerrar', label: 'Cerrar solicitud', tone: 'primary' },
    { action: 'reabrir_trabajo', label: 'Reabrir trabajo', field: 'reason', minLength: 10, tone: 'ghost' },
  ],
  CERRADA: [
    { action: 'reapertura', label: 'Reabrir solicitud', field: 'reason', minLength: 20, tone: 'ghost' },
  ],
};

const ACTION_ROLES: Record<string, string[]> = {
  aprobar: ['ADMIN', 'COORDINADOR'],
  cancelar: ['ADMIN', 'COORDINADOR', 'CLIENTE'],
  asignar: ['ADMIN', 'COORDINADOR'],
  iniciar: ['TECNICO'],
  solicitar_info: ['TECNICO', 'COORDINADOR'],
  reanudar: ['TECNICO', 'COORDINADOR'],
  resolver: ['TECNICO'],
  cerrar: ['ADMIN', 'COORDINADOR', 'CLIENTE'],
  reapertura: ['ADMIN', 'COORDINADOR'],
  reabrir_trabajo: ['COORDINADOR'],
};

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.get<RequestDetail>(`/solicitudes/${id}`),
    enabled: Boolean(id),
  });

  const [selectedAction, setSelectedAction] = useState<ActionOption | null>(null);
  const [actionText, setActionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [technicianId, setTechnicianId] = useState('');
  const [assignReason, setAssignReason] = useState('');

  const [uploading, setUploading] = useState(false);

  const request = query.data;

  const techniciansQuery = useQuery({
    queryKey: ['technicians', 'assign', request?.category?.specialtyId],
    queryFn: () => {
      const params = new URLSearchParams({ page: '1', pageSize: '100', availability: 'DISPONIBLE' });
      if (request?.category?.specialtyId) params.set('specialtyId', String(request.category.specialtyId));
      return api.list<Technician>(`/tecnicos?${params.toString()}`);
    },
    enabled: assignOpen,
  });

  const actions = useMemo(() => {
    if (!request || !user) return [];
    return (ACTION_RULES[request.status] ?? []).filter((option) =>
      ACTION_ROLES[option.action]?.includes(user.role)
    );
  }, [request, user]);

  const refresh = async () => {
    await query.refetch();
    void queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  const openAction = (option: ActionOption) => {
    setSelectedAction(option);
    setActionText('');
  };

  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!request || !selectedAction) return;

    const field = selectedAction.field;
    if (field && actionText.trim().length < (selectedAction.minLength ?? 1)) {
      toast.error('Comentario demasiado corto', `Mínimo ${selectedAction.minLength} caracteres.`);
      return;
    }

    setSubmitting(true);
    try {
      if (selectedAction.action === 'reapertura') {
        await api.post(`/solicitudes/${request.id}/reabrir`, {
          reason: actionText.trim(),
          version: request.version,
        });
      } else {
        const body: Record<string, unknown> = {
          action: selectedAction.action,
          version: request.version,
        };
        if (field) body[field] = actionText.trim();
        await api.patch(`/solicitudes/${request.id}/estado`, body);
      }
      toast.success('Estado actualizado');
      setSelectedAction(null);
      await refresh();
    } catch (err) {
      toast.error('No se pudo actualizar la solicitud', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitAssignment = async (event: FormEvent) => {
    event.preventDefault();
    if (!request || !technicianId) return;

    if (request.currentAssignment && assignReason.trim().length < 10) {
      toast.error('Motivo requerido', 'La reasignación exige un motivo de al menos 10 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/solicitudes/${request.id}/asignaciones`, {
        technicianId,
        reason: assignReason.trim() || null,
        version: request.version,
      });
      toast.success('Técnico asignado');
      setAssignOpen(false);
      setTechnicianId('');
      setAssignReason('');
      await refresh();
    } catch (err) {
      toast.error('No se pudo asignar el técnico', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadAttachment = async (file: File | undefined) => {
    if (!file || !request) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Archivo demasiado grande', 'El máximo permitido es 10 MB.');
      return;
    }
    setUploading(true);
    try {
      await api.upload<Attachment>(`/solicitudes/${request.id}/adjuntos`, file);
      toast.success('Adjunto cargado');
      await refresh();
    } catch (err) {
      toast.error('No se pudo cargar el adjunto', errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const blob = await apiDownload(`/solicitudes/${id}/adjuntos/${attachment.id}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('No se pudo descargar el archivo', errorMessage(err));
    }
  };

  const deleteAttachment = async (attachment: Attachment) => {
    if (!window.confirm(`¿Eliminar el adjunto "${attachment.fileName}"?`)) return;
    try {
      await api.delete(`/solicitudes/${id}/adjuntos/${attachment.id}`);
      toast.success('Adjunto eliminado');
      await refresh();
    } catch (err) {
      toast.error('No se pudo eliminar el adjunto', errorMessage(err));
    }
  };

  if (query.isLoading) return <LoadingBlock label="Cargando expediente…" />;
  if (query.isError) return <ErrorBlock error={query.error} onRetry={() => void query.refetch()} />;
  if (!request) return null;

  const canDeleteAttachment = (attachment: Attachment) =>
    request.status !== 'CERRADA' &&
    request.status !== 'CANCELADA' &&
    (user?.role === 'ADMIN' || user?.role === 'COORDINADOR' || attachment.uploadedBy === user?.id);

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate('/solicitudes')}>
        <Icon name="arrowLeft" size={15} /> Volver a solicitudes
      </button>

      <PageHeader
        title={request.category?.name ?? 'Solicitud de servicio'}
        description={`Expediente ${request.code} · Registrada el ${formatDateTime(request.createdAt)} · ${request.client?.businessName ?? ''} · ${request.site?.name ?? ''}`}
        actions={
          <div className="action-bar">
            {actions.map((option) => (
              <button
                key={option.action}
                type="button"
                className={`btn ${option.tone === 'danger' ? 'btn-danger' : option.tone === 'ghost' ? 'btn-ghost' : 'btn-primary'}`}
                onClick={() =>
                  option.action === 'asignar' ? setAssignOpen(true) : openAction(option)
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      {request.isOverdue && (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" size={17} />
          <span>Esta solicitud superó su fecha límite de atención.</span>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          <Card>
            <div className="card-heading">
              <h2>Descripción</h2>
            </div>
            <p className="description-text">{request.description}</p>
            {request.resolution && (
              <div className="callout callout-success">
                <strong>Resolución</strong>
                <p>{request.resolution}</p>
              </div>
            )}
            {request.cancellationReason && (
              <div className="callout callout-danger">
                <strong>Motivo de cancelación</strong>
                <p>{request.cancellationReason}</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="card-heading row-between">
              <div>
                <h2>Adjuntos</h2>
                <p>Archivos PDF o imágenes de hasta 10 MB.</p>
              </div>
              {request.status !== 'CERRADA' && request.status !== 'CANCELADA' && (
                <label className={`btn btn-ghost btn-sm ${uploading ? 'disabled' : ''}`}>
                  <Icon name="paperclip" size={15} />
                  {uploading ? 'Cargando…' : 'Adjuntar'}
                  <input
                    type="file"
                    hidden
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    disabled={uploading}
                    onChange={(event) => {
                      void uploadAttachment(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>

            {request.attachments.length === 0 ? (
              <p className="muted">Sin adjuntos registrados.</p>
            ) : (
              <ul className="attachment-list">
                {request.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <span className="attachment-icon"><Icon name="paperclip" size={16} /></span>
                    <div>
                      <strong>{attachment.fileName}</strong>
                      <small>{formatBytes(attachment.sizeBytes)} · {formatDateTime(attachment.createdAt)}</small>
                    </div>
                    <div className="attachment-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Descargar ${attachment.fileName}`}
                        onClick={() => void downloadAttachment(attachment)}
                      >
                        <Icon name="download" size={17} />
                      </button>
                      {canDeleteAttachment(attachment) && (
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label={`Eliminar ${attachment.fileName}`}
                          onClick={() => void deleteAttachment(attachment)}
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="card-heading">
              <h2>Historial</h2>
              <p>Trazabilidad inmutable de la solicitud.</p>
            </div>
            <ol className="timeline">
              {request.history.length === 0 && (
                <li className="muted">
                  <p>Sin movimientos registrados.</p>
                </li>
              )}
              {request.history.map((event) => (
                <li key={event.id}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{event.action.replace(/_/g, ' ').toLowerCase()}</strong>
                    <span className="timeline-meta">
                      {formatDateTime(event.createdAt)} · {event.actor?.fullName ?? 'Sistema'}
                    </span>
                    {event.fromStatus && event.toStatus && (
                      <div className="timeline-status">
                        <StatusBadge status={event.fromStatus} /> → <StatusBadge status={event.toStatus} />
                      </div>
                    )}
                    {event.comment && <p>{event.comment}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="detail-side">
          <Card>
            <h2>Estado</h2>
            <div className="detail-status"><StatusBadge status={request.status} /></div>
            <dl className="detail-list">
              <div><dt>Prioridad</dt><dd><PriorityBadge priority={request.priority} /></dd></div>
              <div><dt>Vence</dt><dd>{formatDateTime(request.dueAt)}</dd></div>
              <div><dt>Versión</dt><dd>{request.version}</dd></div>
              <div><dt>Cliente</dt><dd>{request.client?.businessName ?? '—'}</dd></div>
              <div><dt>Sede</dt><dd>{request.site?.name ?? '—'}</dd></div>
              <div><dt>Equipo</dt><dd>{request.asset ? `${request.asset.code} — ${request.asset.name}` : '—'}</dd></div>
            </dl>
          </Card>

          <Card>
            <h2>Técnico responsable</h2>
            {request.assignedTechnician ? (
              <div className="assigned-card">
                <span className="avatar">
                  {request.assignedTechnician.fullName.split(' ').slice(0, 2).map((part) => part[0]).join('')}
                </span>
                <div>
                  <strong>{request.assignedTechnician.fullName}</strong>
                  <small>{request.assignedTechnician.employeeCode}</small>
                </div>
              </div>
            ) : (
              <p className="muted">Aún no hay un técnico asignado.</p>
            )}
            {request.currentAssignment?.reason && (
              <p className="assignment-reason">{request.currentAssignment.reason}</p>
            )}
          </Card>

          <Card>
            <h2>Fechas clave</h2>
            <dl className="detail-list">
              <div><dt>Aprobada</dt><dd>{formatDateTime(request.approvedAt)}</dd></div>
              <div><dt>Asignada</dt><dd>{formatDateTime(request.assignedAt)}</dd></div>
              <div><dt>Iniciada</dt><dd>{formatDateTime(request.startedAt)}</dd></div>
              <div><dt>Resuelta</dt><dd>{formatDateTime(request.resolvedAt)}</dd></div>
              <div><dt>Cerrada</dt><dd>{formatDateTime(request.closedAt)}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>

      <Modal
        open={Boolean(selectedAction)}
        title={selectedAction?.label ?? ''}
        onClose={() => setSelectedAction(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setSelectedAction(null)}>
              Cancelar
            </button>
            <button type="submit" form="action-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Confirmar'}
            </button>
          </>
        }
      >
        <form id="action-form" onSubmit={submitAction} className="form-stack">
          <p className="muted">
            Estado actual: <strong>{STATUS_LABELS[request.status]}</strong> · versión {request.version}
          </p>
          {selectedAction?.field ? (
            <label className="field">
              <span>
                {selectedAction.field === 'resolution'
                  ? 'Resolución'
                  : selectedAction.field === 'reason'
                    ? 'Motivo'
                    : 'Comentario'}
              </span>
              <textarea
                value={actionText}
                onChange={(event) => setActionText(event.target.value)}
                rows={5}
                minLength={selectedAction.minLength}
                required
                placeholder={`Mínimo ${selectedAction.minLength} caracteres…`}
              />
            </label>
          ) : (
            <label className="field">
              <span>Comentario (opcional)</span>
              <textarea
                value={actionText}
                onChange={(event) => setActionText(event.target.value)}
                rows={3}
              />
            </label>
          )}
        </form>
      </Modal>

      <Modal
        open={assignOpen}
        title={request.currentAssignment ? 'Reasignar técnico' : 'Asignar técnico'}
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAssignOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="assign-form" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Asignando…' : 'Asignar'}
            </button>
          </>
        }
      >
        {techniciansQuery.isLoading ? (
          <LoadingBlock label="Buscando técnicos disponibles…" />
        ) : techniciansQuery.isError ? (
          <ErrorBlock error={techniciansQuery.error} onRetry={() => void techniciansQuery.refetch()} />
        ) : (
          <form id="assign-form" onSubmit={submitAssignment} className="form-stack">
            <label className="field">
              <span>Técnico disponible</span>
              <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} required>
                <option value="">Selecciona un técnico…</option>
                {techniciansQuery.data?.data.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.user.fullName} · {technician.employeeCode} · {technician.activeLoad}/{technician.maxConcurrentLoad}
                  </option>
                ))}
              </select>
              {request.category?.specialtyId && (
                <small>Filtrado por la especialidad de la categoría.</small>
              )}
            </label>
            <label className="field">
              <span>{request.currentAssignment ? 'Motivo de reasignación' : 'Motivo (opcional)'}</span>
              <textarea
                value={assignReason}
                onChange={(event) => setAssignReason(event.target.value)}
                rows={3}
                required={Boolean(request.currentAssignment)}
                minLength={request.currentAssignment ? 10 : undefined}
              />
            </label>
          </form>
        )}
      </Modal>
    </div>
  );
}
