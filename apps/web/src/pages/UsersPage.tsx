import { useEffect, useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/Feedback';
import { Card, Modal, PageHeader, Pagination, Badge } from '../components/Ui';
import { api } from '../lib/api';
import { PasswordField } from '../components/PasswordField';
import type { Client, User } from '../lib/types';
import { ROLE_LABELS, errorMessage, formatDateTime } from '../lib/utils';

interface UserFormState {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  clientId: string;
  temporaryPassword: string;
}

const EMPTY_FORM: UserFormState = {
  fullName: '',
  email: '',
  phone: '',
  role: 'COORDINADOR',
  clientId: '',
  temporaryPassword: '',
};

const ROLES: Role[] = ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE'];

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['users', page, search, role, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      return api.list<User>(`/usuarios?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const clientsQuery = useQuery({
    queryKey: ['clients', 'options'],
    queryFn: () => api.list<Client>('/clientes?page=1&pageSize=100&status=ACTIVO'),
    enabled: creating || form.role === 'CLIENTE',
  });

  useEffect(() => {
    setPage(1);
  }, [search, role, status]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (user: User) => {
    setForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      clientId: user.clientId ?? '',
      temporaryPassword: '',
    });
    setEditing(user);
    setCreating(false);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (form.role === 'CLIENTE' && !form.clientId) {
      toast.error('Cliente requerido', 'Los usuarios con rol Cliente deben estar asociados a un cliente.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/usuarios/${editing.id}`, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          clientId: form.role === 'CLIENTE' ? form.clientId : null,
        });
        toast.success('Usuario actualizado');
      } else {
        await api.post('/usuarios', {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          clientId: form.role === 'CLIENTE' ? form.clientId : null,
          temporaryPassword: form.temporaryPassword,
        });
        toast.success('Usuario creado', 'Deberá cambiar la contraseña al ingresar.');
      }
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error('No se pudo guardar el usuario', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (user: User) => {
    if (!window.confirm(`¿Desactivar a ${user.fullName}?`)) return;
    try {
      await api.delete(`/usuarios/${user.id}`);
      toast.success('Usuario desactivado');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error('No se pudo desactivar el usuario', errorMessage(err));
    }
  };

  const activate = async (user: User) => {
    try {
      await api.patch(`/usuarios/${user.id}`, { status: 'ACTIVO' });
      toast.success('Usuario reactivado');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      toast.error('No se pudo reactivar el usuario', errorMessage(err));
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Cuentas, roles y acceso al sistema."
        actions={<button type="button" className="btn btn-primary" onClick={openCreate}>Nuevo usuario</button>}
      />

      <Card>
        <div className="toolbar">
          <input
            className="search-input"
            type="search"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            {ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>

        {query.isLoading && <LoadingBlock label="Cargando usuarios…" />}
        {query.isError && <ErrorBlock error={query.error} onRetry={() => void query.refetch()} />}
        {query.data && query.data.data.length === 0 && (
          <EmptyBlock title="Sin usuarios" description="No hay cuentas que coincidan con los filtros." />
        )}
        {query.data && query.data.data.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th className="align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.fullName}</strong>
                      <small>{item.email}</small>
                    </td>
                    <td><Badge tone="neutral">{ROLE_LABELS[item.role]}</Badge></td>
                    <td>
                      <Badge tone={item.status === 'ACTIVO' ? 'success' : 'neutral'}>
                        {item.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td>{formatDateTime(item.lastLoginAt)}</td>
                    <td className="align-right">
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        {item.status === 'ACTIVO' ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={item.id === currentUser?.id}
                            title={item.id === currentUser?.id ? 'No puedes desactivar tu propia cuenta' : undefined}
                            onClick={() => void deactivate(item)}
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void activate(item)}>
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {query.data && (
          <Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onChange={setPage} />
        )}
      </Card>

      <Modal
        open={creating || Boolean(editing)}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
            <button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="user-form" className="form-stack" onSubmit={submit}>
          <div className="form-row">
            <label className="field">
              <span>Nombre completo</span>
              <input
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                minLength={3}
                required
              />
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                maxLength={20}
              />
            </label>
          </div>

          <label className="field">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              disabled={Boolean(editing)}
            />
          </label>

          <div className="form-row">
            <label className="field">
              <span>Rol</span>
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
              >
                {ROLES.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
              </select>
            </label>

            {form.role === 'CLIENTE' && (
              <label className="field">
                <span>Cliente asociado</span>
                <select
                  value={form.clientId}
                  onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                  required
                >
                  <option value="">Selecciona un cliente…</option>
                  {clientsQuery.data?.data.map((client) => (
                    <option key={client.id} value={client.id}>{client.businessName}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {!editing && (
            <PasswordField
              label="Contraseña temporal"
              value={form.temporaryPassword}
              onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })}
              minLength={8}
              required
              autoComplete="new-password"
              hint="Mínimo 8 caracteres. El usuario deberá cambiarla en su primer ingreso."
            />
          )}
        </form>
      </Modal>
    </div>
  );
}
