import { useEffect, useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/Feedback';
import { Badge, Card, Modal, PageHeader, Pagination } from '../components/Ui';
import { api } from '../lib/api';
import type { Specialty, Technician, User } from '../lib/types';
import { cn, errorMessage, formatDateTime } from '../lib/utils';

const LEVELS = ['BASICO', 'INTERMEDIO', 'AVANZADO'] as const;
type SpecialtyLevel = (typeof LEVELS)[number];

const LEVEL_LABELS: Record<SpecialtyLevel, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

interface TechnicianFormState {
  userId: string;
  employeeCode: string;
  maxConcurrentLoad: number;
  availability: 'DISPONIBLE' | 'NO_DISPONIBLE';
}

const EMPTY_FORM: TechnicianFormState = {
  userId: '',
  employeeCode: '',
  maxConcurrentLoad: 5,
  availability: 'DISPONIBLE',
};

export function TechniciansPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [availability, setAvailability] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [form, setForm] = useState<TechnicianFormState>(EMPTY_FORM);
  const [selectedSpecialties, setSelectedSpecialties] = useState<Record<number, SpecialtyLevel>>({});
  const [saving, setSaving] = useState(false);

  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get<Specialty[]>('/especialidades'),
  });

  const query = useQuery({
    queryKey: ['technicians', page, search, availability, specialtyId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (availability) params.set('availability', availability);
      if (specialtyId) params.set('specialtyId', specialtyId);
      return api.list<Technician>(`/tecnicos?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'technician-options'],
    queryFn: () => api.list<User>('/usuarios?role=TECNICO&status=ACTIVO&pageSize=100'),
    enabled: modalOpen && canManage && !editing,
  });

  useEffect(() => {
    setPage(1);
  }, [search, availability, specialtyId]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSelectedSpecialties({});
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (technician: Technician) => {
    setForm({
      userId: technician.userId,
      employeeCode: technician.employeeCode,
      maxConcurrentLoad: technician.maxConcurrentLoad,
      availability: technician.availability,
    });
    setSelectedSpecialties(
      Object.fromEntries(technician.specialties.map((item) => [item.specialtyId, item.level]))
    );
    setEditing(technician);
    setModalOpen(true);
  };

  const toggleSpecialty = (id: number) => {
    setSelectedSpecialties((current) => {
      const next = { ...current };
      if (next[id]) delete next[id];
      else next[id] = 'INTERMEDIO';
      return next;
    });
  };

  const setLevel = (id: number, level: SpecialtyLevel) => {
    setSelectedSpecialties((current) => ({ ...current, [id]: level }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const specialties = Object.entries(selectedSpecialties).map(([id, level]) => ({
      specialtyId: Number(id),
      level,
    }));

    if (specialties.length === 0) {
      toast.error('Especialidades requeridas', 'Selecciona al menos una especialidad.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/tecnicos/${editing.id}`, {
          employeeCode: form.employeeCode.trim(),
          maxConcurrentLoad: Number(form.maxConcurrentLoad),
          availability: form.availability,
        });
        await api.put(`/tecnicos/${editing.id}/especialidades`, { specialties });
        toast.success('Técnico actualizado');
      } else {
        await api.post('/tecnicos', {
          userId: form.userId,
          employeeCode: form.employeeCode.trim(),
          maxConcurrentLoad: Number(form.maxConcurrentLoad),
          availability: form.availability,
          specialties,
        });
        toast.success('Técnico registrado');
      }
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['technicians'] });
    } catch (err) {
      toast.error('No se pudo guardar el técnico', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (technician: Technician) => {
    if (!window.confirm(`¿Desactivar al técnico ${technician.user.fullName}?`)) return;
    try {
      await api.delete(`/tecnicos/${technician.id}`);
      toast.success('Técnico desactivado');
      void queryClient.invalidateQueries({ queryKey: ['technicians'] });
    } catch (err) {
      toast.error('No se pudo desactivar el técnico', errorMessage(err));
    }
  };

  const toggleAvailability = async (technician: Technician) => {
    const next = technician.availability === 'DISPONIBLE' ? 'NO_DISPONIBLE' : 'DISPONIBLE';
    try {
      await api.patch(`/tecnicos/${technician.id}`, { availability: next });
      toast.success(next === 'DISPONIBLE' ? 'Técnico disponible' : 'Técnico no disponible');
      void queryClient.invalidateQueries({ queryKey: ['technicians'] });
    } catch (err) {
      toast.error('No se pudo actualizar la disponibilidad', errorMessage(err));
    }
  };

  const activeSpecialties = (specialtiesQuery.data ?? []).filter((item) => item.status === 'ACTIVA');
  const availableUsers = (usersQuery.data?.data ?? []).filter(
    (candidate) => !query.data?.data.some((technician) => technician.userId === candidate.id)
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="Operación"
        title="Técnicos"
        description="Especialidades, disponibilidad y carga concurrente del equipo técnico."
        actions={canManage ? <button type="button" className="btn btn-primary" onClick={openCreate}>Nuevo técnico</button> : undefined}
      />

      <Card>
        <div className="toolbar">
          <input
            className="search-input"
            type="search"
            placeholder="Buscar por nombre, correo o código…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} aria-label="Filtrar por especialidad">
            <option value="">Todas las especialidades</option>
            {activeSpecialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
            ))}
          </select>
          <select value={availability} onChange={(event) => setAvailability(event.target.value)} aria-label="Filtrar por disponibilidad">
            <option value="">Toda disponibilidad</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="NO_DISPONIBLE">No disponibles</option>
          </select>
        </div>

        {query.isLoading && <LoadingBlock label="Cargando técnicos…" />}
        {query.isError && <ErrorBlock error={query.error} onRetry={() => void query.refetch()} />}
        {query.data && query.data.data.length === 0 && (
          <EmptyBlock title="Sin técnicos" description="No hay técnicos que coincidan con los filtros." icon="wrench" />
        )}
        {query.data && query.data.data.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>Especialidades</th>
                  <th>Carga</th>
                  <th>Disponibilidad</th>
                  <th>Estado</th>
                  {canManage && <th className="align-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((technician) => {
                  const loadRatio = technician.maxConcurrentLoad > 0
                    ? technician.activeLoad / technician.maxConcurrentLoad
                    : 0;
                  return (
                    <tr key={technician.id}>
                      <td>
                        <strong>{technician.user.fullName}</strong>
                        <small>{technician.employeeCode} · {technician.user.email}</small>
                      </td>
                      <td>
                        <div className="tag-list">
                          {technician.specialties.map((specialty) => (
                            <span className="tag" key={specialty.specialtyId}>
                              {specialty.name} · {LEVEL_LABELS[specialty.level]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="load-cell">
                          <span>{technician.activeLoad}/{technician.maxConcurrentLoad}</span>
                          <span className="load-bar">
                            <span
                              className={cn('load-fill', loadRatio >= 1 && 'full', loadRatio >= 0.8 && 'high')}
                              style={{ width: `${Math.min(loadRatio * 100, 100)}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge tone={technician.availability === 'DISPONIBLE' ? 'success' : 'neutral'}>
                          {technician.availability === 'DISPONIBLE' ? 'Disponible' : 'No disponible'}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone={technician.user.status === 'ACTIVO' ? 'success' : 'neutral'}>
                          {technician.user.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <small>Alta: {formatDateTime(technician.createdAt)}</small>
                      </td>
                      {canManage && (
                        <td className="align-right">
                          <div className="row-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(technician)}>
                              Editar
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void toggleAvailability(technician)}>
                              {technician.availability === 'DISPONIBLE' ? 'Pausar' : 'Activar'}
                            </button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => void deactivate(technician)}>
                              Desactivar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {query.data && (
          <Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onChange={setPage} />
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Editar técnico' : 'Nuevo técnico'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" form="technician-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="technician-form" className="form-stack" onSubmit={submit}>
          {!editing && (
            <label className="field">
              <span>Usuario técnico</span>
              <select
                value={form.userId}
                onChange={(event) => setForm({ ...form, userId: event.target.value })}
                required
              >
                <option value="">Selecciona un usuario activo…</option>
                {availableUsers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.fullName} · {candidate.email}
                  </option>
                ))}
              </select>
              {usersQuery.isLoading && <small>Buscando usuarios técnicos…</small>}
              {!usersQuery.isLoading && availableUsers.length === 0 && (
                <small>No hay usuarios técnicos activos disponibles. Crea primero el usuario.</small>
              )}
            </label>
          )}

          <div className="form-row">
            <label className="field">
              <span>Código de empleado</span>
              <input
                value={form.employeeCode}
                onChange={(event) => setForm({ ...form, employeeCode: event.target.value })}
                minLength={2}
                maxLength={20}
                required
              />
            </label>
            <label className="field">
              <span>Carga máxima concurrente</span>
              <input
                type="number"
                min={1}
                max={50}
                value={form.maxConcurrentLoad}
                onChange={(event) => setForm({ ...form, maxConcurrentLoad: Number(event.target.value) })}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Disponibilidad</span>
            <select
              value={form.availability}
              onChange={(event) => setForm({ ...form, availability: event.target.value as TechnicianFormState['availability'] })}
            >
              <option value="DISPONIBLE">Disponible</option>
              <option value="NO_DISPONIBLE">No disponible</option>
            </select>
          </label>

          <fieldset className="field">
            <legend>Especialidades</legend>
            <div className="specialty-picker">
              {activeSpecialties.map((specialty) => {
                const selected = selectedSpecialties[specialty.id];
                return (
                  <div key={specialty.id} className={cn('specialty-option', selected && 'selected')}>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={() => toggleSpecialty(specialty.id)}
                      />
                      <span>{specialty.name}</span>
                    </label>
                    {selected && (
                      <select
                        value={selected}
                        onChange={(event) => setLevel(specialty.id, event.target.value as SpecialtyLevel)}
                        aria-label={`Nivel de ${specialty.name}`}
                      >
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>{LEVEL_LABELS[level]}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </form>
      </Modal>
    </div>
  );
}
