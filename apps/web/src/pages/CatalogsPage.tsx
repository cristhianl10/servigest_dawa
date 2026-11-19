import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PRIORITIES, type Priority } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/Feedback';
import { Badge, Card, Modal, PageHeader } from '../components/Ui';
import { api } from '../lib/api';
import type {
  Holiday,
  ServiceCategory,
  Specialty,
  SystemParameter,
} from '../lib/types';
import { PRIORITY_LABELS, cn, errorMessage, formatDate } from '../lib/utils';

type Tab = 'especialidades' | 'categorias' | 'parametros' | 'feriados';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'especialidades', label: 'Especialidades' },
  { id: 'categorias', label: 'Categorías de servicio' },
  { id: 'parametros', label: 'Parámetros' },
  { id: 'feriados', label: 'Feriados' },
];

interface SpecialtyFormState {
  code: string;
  name: string;
  description: string;
  status: 'ACTIVA' | 'INACTIVA';
}

interface CategoryFormState {
  code: string;
  name: string;
  specialtyId: string;
  defaultPriority: Priority;
  status: 'ACTIVA' | 'INACTIVA';
}

const EMPTY_SPECIALTY: SpecialtyFormState = {
  code: '',
  name: '',
  description: '',
  status: 'ACTIVA',
};

const EMPTY_CATEGORY: CategoryFormState = {
  code: '',
  name: '',
  specialtyId: '',
  defaultPriority: 'MEDIA',
  status: 'ACTIVA',
};

export function CatalogsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('especialidades');
  const [saving, setSaving] = useState(false);

  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get<Specialty[]>('/especialidades'),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<ServiceCategory[]>('/categorias-servicio'),
  });
  const parametersQuery = useQuery({
    queryKey: ['parameters'],
    queryFn: () => api.get<SystemParameter[]>('/parametros'),
  });
  const holidaysQuery = useQuery({
    queryKey: ['holidays'],
    queryFn: () => api.get<Holiday[]>('/feriados'),
  });

  const [specialtyModal, setSpecialtyModal] = useState<'create' | 'edit' | null>(null);
  const [specialtyForm, setSpecialtyForm] = useState<SpecialtyFormState>(EMPTY_SPECIALTY);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);

  const [categoryModal, setCategoryModal] = useState<'create' | 'edit' | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(EMPTY_CATEGORY);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  const [parameter, setParameter] = useState<SystemParameter | null>(null);
  const [parameterValue, setParameterValue] = useState('');

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  const openCreateSpecialty = () => {
    setSpecialtyForm(EMPTY_SPECIALTY);
    setEditingSpecialty(null);
    setSpecialtyModal('create');
  };

  const openEditSpecialty = (specialty: Specialty) => {
    setSpecialtyForm({
      code: specialty.code,
      name: specialty.name,
      description: specialty.description ?? '',
      status: specialty.status,
    });
    setEditingSpecialty(specialty);
    setSpecialtyModal('edit');
  };

  const submitSpecialty = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: specialtyForm.code.trim().toUpperCase(),
        name: specialtyForm.name.trim(),
        description: specialtyForm.description.trim() || null,
      };
      if (specialtyModal === 'create') {
        await api.post('/especialidades', payload);
        toast.success('Especialidad creada');
      } else if (editingSpecialty) {
        await api.patch(`/especialidades/${editingSpecialty.id}`, {
          ...payload,
          status: specialtyForm.status,
        });
        toast.success('Especialidad actualizada');
      }
      setSpecialtyModal(null);
      void queryClient.invalidateQueries({ queryKey: ['specialties'] });
    } catch (err) {
      toast.error('No se pudo guardar la especialidad', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivateSpecialty = async (specialty: Specialty) => {
    if (!window.confirm(`¿Desactivar la especialidad ${specialty.name}?`)) return;
    try {
      await api.delete(`/especialidades/${specialty.id}`);
      toast.success('Especialidad desactivada');
      void queryClient.invalidateQueries({ queryKey: ['specialties'] });
    } catch (err) {
      toast.error('No se pudo desactivar la especialidad', errorMessage(err));
    }
  };

  const openCreateCategory = () => {
    setCategoryForm({
      ...EMPTY_CATEGORY,
      specialtyId: String(specialtiesQuery.data?.[0]?.id ?? ''),
    });
    setEditingCategory(null);
    setCategoryModal('create');
  };

  const openEditCategory = (category: ServiceCategory) => {
    setCategoryForm({
      code: category.code,
      name: category.name,
      specialtyId: String(category.specialtyId),
      defaultPriority: category.defaultPriority,
      status: category.status,
    });
    setEditingCategory(category);
    setCategoryModal('edit');
  };

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: categoryForm.code.trim().toUpperCase(),
        name: categoryForm.name.trim(),
        specialtyId: Number(categoryForm.specialtyId),
        defaultPriority: categoryForm.defaultPriority,
      };
      if (categoryModal === 'create') {
        await api.post('/categorias-servicio', payload);
        toast.success('Categoría creada');
      } else if (editingCategory) {
        await api.patch(`/categorias-servicio/${editingCategory.id}`, {
          ...payload,
          status: categoryForm.status,
        });
        toast.success('Categoría actualizada');
      }
      setCategoryModal(null);
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      toast.error('No se pudo guardar la categoría', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivateCategory = async (category: ServiceCategory) => {
    if (!window.confirm(`¿Desactivar la categoría ${category.name}?`)) return;
    try {
      await api.delete(`/categorias-servicio/${category.id}`);
      toast.success('Categoría desactivada');
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      toast.error('No se pudo desactivar la categoría', errorMessage(err));
    }
  };

  const openParameter = (item: SystemParameter) => {
    setParameter(item);
    setParameterValue(JSON.stringify(item.value, null, 2));
  };

  const submitParameter = async (event: FormEvent) => {
    event.preventDefault();
    if (!parameter) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(parameterValue);
    } catch {
      toast.error('JSON inválido', 'El valor debe ser un JSON válido (texto entre comillas, número, booleano, lista u objeto).');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/parametros/${encodeURIComponent(parameter.key)}`, {
        value: parsed,
        description: parameter.description,
      });
      toast.success('Parámetro actualizado');
      setParameter(null);
      void queryClient.invalidateQueries({ queryKey: ['parameters'] });
    } catch (err) {
      toast.error('No se pudo actualizar el parámetro', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/feriados', { date: holidayDate, name: holidayName.trim() });
      toast.success('Feriado agregado');
      setHolidayDate('');
      setHolidayName('');
      void queryClient.invalidateQueries({ queryKey: ['holidays'] });
    } catch (err) {
      toast.error('No se pudo agregar el feriado', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeHoliday = async (holiday: Holiday) => {
    if (!window.confirm(`¿Eliminar el feriado ${holiday.name}?`)) return;
    try {
      await api.delete(`/feriados/${holiday.date}`);
      toast.success('Feriado eliminado');
      void queryClient.invalidateQueries({ queryKey: ['holidays'] });
    } catch (err) {
      toast.error('No se pudo eliminar el feriado', errorMessage(err));
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Configuración"
        title="Catálogos y parámetros"
        description="Datos maestros que gobiernan el flujo de servicio y los SLA."
      />

      <div className="tabs" role="tablist" aria-label="Catálogos">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn('tab', tab === item.id && 'active')}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'especialidades' && (
        <Card>
          <div className="card-heading row-between">
            <div>
              <h2>Especialidades</h2>
              <p>Áreas de conocimiento que agrupan las categorías de servicio.</p>
            </div>
            {canManage && <button type="button" className="btn btn-primary btn-sm" onClick={openCreateSpecialty}>Nueva especialidad</button>}
          </div>
          {specialtiesQuery.isLoading && <LoadingBlock label="Cargando especialidades…" />}
          {specialtiesQuery.isError && <ErrorBlock error={specialtiesQuery.error} onRetry={() => void specialtiesQuery.refetch()} />}
          {specialtiesQuery.data && specialtiesQuery.data.length === 0 && (
            <EmptyBlock title="Sin especialidades" description="Registra la primera especialidad para comenzar." icon="book" />
          )}
          {specialtiesQuery.data && specialtiesQuery.data.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th>{canManage && <th className="align-right">Acciones</th>}</tr>
                </thead>
                <tbody>
                  {specialtiesQuery.data.map((specialty) => (
                    <tr key={specialty.id}>
                      <td><strong>{specialty.code}</strong></td>
                      <td>{specialty.name}</td>
                      <td>{specialty.description || '—'}</td>
                      <td><Badge tone={specialty.status === 'ACTIVA' ? 'success' : 'neutral'}>{specialty.status === 'ACTIVA' ? 'Activa' : 'Inactiva'}</Badge></td>
                      {canManage && (
                        <td className="align-right">
                          <div className="row-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditSpecialty(specialty)}>Editar</button>
                            {specialty.status === 'ACTIVA' && (
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => void deactivateSpecialty(specialty)}>Desactivar</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'categorias' && (
        <Card>
          <div className="card-heading row-between">
            <div>
              <h2>Categorías de servicio</h2>
              <p>Definen la especialidad requerida y la prioridad sugerida.</p>
            </div>
            {canManage && <button type="button" className="btn btn-primary btn-sm" onClick={openCreateCategory}>Nueva categoría</button>}
          </div>
          {categoriesQuery.isLoading && <LoadingBlock label="Cargando categorías…" />}
          {categoriesQuery.isError && <ErrorBlock error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} />}
          {categoriesQuery.data && categoriesQuery.data.length === 0 && (
            <EmptyBlock title="Sin categorías" description="Registra la primera categoría de servicio." icon="book" />
          )}
          {categoriesQuery.data && categoriesQuery.data.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Código</th><th>Categoría</th><th>Especialidad</th><th>Prioridad sugerida</th><th>Estado</th>{canManage && <th className="align-right">Acciones</th>}</tr>
                </thead>
                <tbody>
                  {categoriesQuery.data.map((category) => (
                    <tr key={category.id}>
                      <td><strong>{category.code}</strong></td>
                      <td>{category.name}</td>
                      <td>{category.specialty?.name ?? specialtiesQuery.data?.find((item) => item.id === category.specialtyId)?.name ?? '—'}</td>
                      <td><Badge tone={`priority-${category.defaultPriority.toLowerCase()}`}>{PRIORITY_LABELS[category.defaultPriority]}</Badge></td>
                      <td><Badge tone={category.status === 'ACTIVA' ? 'success' : 'neutral'}>{category.status === 'ACTIVA' ? 'Activa' : 'Inactiva'}</Badge></td>
                      {canManage && (
                        <td className="align-right">
                          <div className="row-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditCategory(category)}>Editar</button>
                            {category.status === 'ACTIVA' && (
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => void deactivateCategory(category)}>Desactivar</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'parametros' && (
        <Card>
          <div className="card-heading">
            <h2>Parámetros del sistema</h2>
            <p>Valores de configuración del SLA, notificaciones y operación.</p>
          </div>
          {parametersQuery.isLoading && <LoadingBlock label="Cargando parámetros…" />}
          {parametersQuery.isError && <ErrorBlock error={parametersQuery.error} onRetry={() => void parametersQuery.refetch()} />}
          {parametersQuery.data && parametersQuery.data.length === 0 && (
            <p className="muted">No hay parámetros configurados.</p>
          )}
          {parametersQuery.data && parametersQuery.data.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Clave</th><th>Valor</th><th>Descripción</th>{canManage && <th className="align-right">Acciones</th>}</tr>
                </thead>
                <tbody>
                  {parametersQuery.data.map((item) => (
                    <tr key={item.key}>
                      <td><code>{item.key}</code></td>
                      <td><code className="value-code">{JSON.stringify(item.value)}</code></td>
                      <td>{item.description || '—'}</td>
                      {canManage && (
                        <td className="align-right">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openParameter(item)}>Editar</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'feriados' && (
        <Card>
          <div className="card-heading">
            <h2>Feriados</h2>
            <p>Días excluidos del cómputo de SLA.</p>
          </div>

          {canManage && (
            <form className="inline-form" onSubmit={addHoliday}>
              <label className="field">
                <span>Fecha</span>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(event) => setHolidayDate(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Nombre</span>
                <input
                  value={holidayName}
                  onChange={(event) => setHolidayName(event.target.value)}
                  minLength={3}
                  maxLength={120}
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={saving}>Agregar</button>
            </form>
          )}

          {holidaysQuery.isLoading && <LoadingBlock label="Cargando feriados…" />}
          {holidaysQuery.isError && <ErrorBlock error={holidaysQuery.error} onRetry={() => void holidaysQuery.refetch()} />}
          {holidaysQuery.data && holidaysQuery.data.length === 0 && (
            <p className="muted">No hay feriados registrados.</p>
          )}
          {holidaysQuery.data && holidaysQuery.data.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Fecha</th><th>Nombre</th>{canManage && <th className="align-right">Acciones</th>}</tr>
                </thead>
                <tbody>
                  {holidaysQuery.data.map((holiday) => (
                    <tr key={holiday.date}>
                      <td>{formatDate(holiday.date)}</td>
                      <td>{holiday.name}</td>
                      {canManage && (
                        <td className="align-right">
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => void removeHoliday(holiday)}>Eliminar</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal
        open={specialtyModal !== null}
        title={specialtyModal === 'create' ? 'Nueva especialidad' : 'Editar especialidad'}
        onClose={() => setSpecialtyModal(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setSpecialtyModal(null)}>Cancelar</button>
            <button type="submit" form="specialty-form" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        <form id="specialty-form" className="form-stack" onSubmit={submitSpecialty}>
          <div className="form-row">
            <label className="field">
              <span>Código</span>
              <input value={specialtyForm.code} onChange={(event) => setSpecialtyForm({ ...specialtyForm, code: event.target.value })} minLength={2} maxLength={30} required />
            </label>
            <label className="field">
              <span>Nombre</span>
              <input value={specialtyForm.name} onChange={(event) => setSpecialtyForm({ ...specialtyForm, name: event.target.value })} minLength={3} maxLength={100} required />
            </label>
          </div>
          <label className="field">
            <span>Descripción</span>
            <textarea value={specialtyForm.description} onChange={(event) => setSpecialtyForm({ ...specialtyForm, description: event.target.value })} rows={3} maxLength={500} />
          </label>
          {specialtyModal === 'edit' && (
            <label className="field">
              <span>Estado</span>
              <select value={specialtyForm.status} onChange={(event) => setSpecialtyForm({ ...specialtyForm, status: event.target.value as SpecialtyFormState['status'] })}>
                <option value="ACTIVA">Activa</option>
                <option value="INACTIVA">Inactiva</option>
              </select>
            </label>
          )}
        </form>
      </Modal>

      <Modal
        open={categoryModal !== null}
        title={categoryModal === 'create' ? 'Nueva categoría' : 'Editar categoría'}
        onClose={() => setCategoryModal(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCategoryModal(null)}>Cancelar</button>
            <button type="submit" form="category-form" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        <form id="category-form" className="form-stack" onSubmit={submitCategory}>
          <div className="form-row">
            <label className="field">
              <span>Código</span>
              <input value={categoryForm.code} onChange={(event) => setCategoryForm({ ...categoryForm, code: event.target.value })} minLength={2} maxLength={30} required />
            </label>
            <label className="field">
              <span>Nombre</span>
              <input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} minLength={3} maxLength={120} required />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Especialidad</span>
              <select value={categoryForm.specialtyId} onChange={(event) => setCategoryForm({ ...categoryForm, specialtyId: event.target.value })} required>
                <option value="">Selecciona una especialidad…</option>
                {specialtiesQuery.data?.filter((specialty) => specialty.status === 'ACTIVA').map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Prioridad sugerida</span>
              <select value={categoryForm.defaultPriority} onChange={(event) => setCategoryForm({ ...categoryForm, defaultPriority: event.target.value as Priority })}>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}
              </select>
            </label>
          </div>
          {categoryModal === 'edit' && (
            <label className="field">
              <span>Estado</span>
              <select value={categoryForm.status} onChange={(event) => setCategoryForm({ ...categoryForm, status: event.target.value as CategoryFormState['status'] })}>
                <option value="ACTIVA">Activa</option>
                <option value="INACTIVA">Inactiva</option>
              </select>
            </label>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(parameter)}
        title="Editar parámetro"
        onClose={() => setParameter(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setParameter(null)}>Cancelar</button>
            <button type="submit" form="parameter-form" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        <form id="parameter-form" className="form-stack" onSubmit={submitParameter}>
          <p className="muted">Clave: <code>{parameter?.key}</code></p>
          {parameter?.description && <p>{parameter.description}</p>}
          <label className="field">
            <span>Valor (JSON)</span>
            <textarea
              value={parameterValue}
              onChange={(event) => setParameterValue(event.target.value)}
              rows={8}
              className="code-input"
              required
            />
            <small>Usa comillas para texto, por ejemplo: "08:00".</small>
          </label>
        </form>
      </Modal>
    </div>
  );
}
