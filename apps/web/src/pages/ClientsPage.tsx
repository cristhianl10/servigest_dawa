import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/Feedback';
import { Badge, Card, Modal, PageHeader, Pagination } from '../components/Ui';
import { api } from '../lib/api';
import type { Asset, Client, Site } from '../lib/types';
import { cn, errorMessage, formatDateTime } from '../lib/utils';

interface ClientFormState {
  ruc: string;
  businessName: string;
  tradeName: string;
  email: string;
  phone: string;
  address: string;
  status: 'ACTIVO' | 'INACTIVO';
}

interface SiteFormState {
  name: string;
  address: string;
  city: string;
  contactName: string;
  contactPhone: string;
  status: 'ACTIVA' | 'INACTIVA';
}

interface AssetFormState {
  code: string;
  name: string;
  assetType: string;
  serialNumber: string;
  status: 'OPERATIVO' | 'FUERA_SERVICIO';
}

const EMPTY_CLIENT: ClientFormState = {
  ruc: '',
  businessName: '',
  tradeName: '',
  email: '',
  phone: '',
  address: '',
  status: 'ACTIVO',
};

const EMPTY_SITE: SiteFormState = {
  name: '',
  address: '',
  city: 'Guayaquil',
  contactName: '',
  contactPhone: '',
  status: 'ACTIVA',
};

const EMPTY_ASSET: AssetFormState = {
  code: '',
  name: '',
  assetType: '',
  serialNumber: '',
  status: 'OPERATIVO',
};

export function ClientsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const [clientForm, setClientForm] = useState<ClientFormState>(EMPTY_CLIENT);
  const [clientModal, setClientModal] = useState<'create' | 'edit' | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [siteForm, setSiteForm] = useState<SiteFormState>(EMPTY_SITE);
  const [siteModal, setSiteModal] = useState<'create' | 'edit' | null>(null);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const [assetForm, setAssetForm] = useState<AssetFormState>(EMPTY_ASSET);
  const [assetModal, setAssetModal] = useState<'create' | 'edit' | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [saving, setSaving] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ['clients', page, search, status],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      return api.list<Client>(`/clientes?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const selectedClient = useMemo(
    () => clientsQuery.data?.data.find((client) => client.id === selectedClientId) ?? null,
    [clientsQuery.data, selectedClientId]
  );

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    if (!selectedClientId && clientsQuery.data?.data.length) {
      setSelectedClientId(clientsQuery.data.data[0].id);
    }
  }, [clientsQuery.data, selectedClientId]);

  useEffect(() => {
    setSelectedSiteId('');
  }, [selectedClientId]);

  const sitesQuery = useQuery({
    queryKey: ['client-sites', selectedClientId],
    queryFn: () => api.get<Site[]>(`/clientes/${selectedClientId}/sedes`),
    enabled: Boolean(selectedClientId),
  });

  const selectedSite = useMemo(
    () => sitesQuery.data?.find((site) => site.id === selectedSiteId) ?? null,
    [sitesQuery.data, selectedSiteId]
  );

  const assetsQuery = useQuery({
    queryKey: ['site-assets', selectedSiteId],
    queryFn: () => api.get<Asset[]>(`/sedes/${selectedSiteId}/equipos`),
    enabled: Boolean(selectedSiteId),
  });

  const invalidateClients = () => {
    void queryClient.invalidateQueries({ queryKey: ['clients'] });
  };
  const invalidateSites = () => {
    void queryClient.invalidateQueries({ queryKey: ['client-sites', selectedClientId] });
  };
  const invalidateAssets = () => {
    void queryClient.invalidateQueries({ queryKey: ['site-assets', selectedSiteId] });
  };

  const openCreateClient = () => {
    setClientForm(EMPTY_CLIENT);
    setEditingClient(null);
    setClientModal('create');
  };

  const openEditClient = (client: Client) => {
    setClientForm({
      ruc: client.ruc,
      businessName: client.businessName,
      tradeName: client.tradeName ?? '',
      email: client.email,
      phone: client.phone ?? '',
      address: client.address ?? '',
      status: client.status,
    });
    setEditingClient(client);
    setClientModal('edit');
  };

  const submitClient = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ruc: clientForm.ruc.trim(),
        businessName: clientForm.businessName.trim(),
        tradeName: clientForm.tradeName.trim() || null,
        email: clientForm.email.trim(),
        phone: clientForm.phone.trim() || null,
        address: clientForm.address.trim() || null,
      };
      if (clientModal === 'create') {
        const created = await api.post<Client>('/clientes', payload);
        toast.success('Cliente registrado');
        invalidateClients();
        setSelectedClientId(created.id);
      } else if (editingClient) {
        await api.patch(`/clientes/${editingClient.id}`, {
          ...payload,
          status: clientForm.status,
        });
        toast.success('Cliente actualizado');
        invalidateClients();
      }
      setClientModal(null);
    } catch (err) {
      toast.error('No se pudo guardar el cliente', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivateClient = async (client: Client) => {
    if (!window.confirm(`¿Desactivar el cliente ${client.businessName}?`)) return;
    try {
      await api.delete(`/clientes/${client.id}`);
      toast.success('Cliente desactivado');
      invalidateClients();
    } catch (err) {
      toast.error('No se pudo desactivar el cliente', errorMessage(err));
    }
  };

  const openCreateSite = () => {
    setSiteForm(EMPTY_SITE);
    setEditingSite(null);
    setSiteModal('create');
  };

  const openEditSite = (site: Site) => {
    setSiteForm({
      name: site.name,
      address: site.address,
      city: site.city,
      contactName: site.contactName ?? '',
      contactPhone: site.contactPhone ?? '',
      status: site.status,
    });
    setEditingSite(site);
    setSiteModal('edit');
  };

  const submitSite = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedClientId) return;
    setSaving(true);
    try {
      const payload = {
        name: siteForm.name.trim(),
        address: siteForm.address.trim(),
        city: siteForm.city.trim(),
        contactName: siteForm.contactName.trim() || null,
        contactPhone: siteForm.contactPhone.trim() || null,
      };
      if (siteModal === 'create') {
        await api.post(`/clientes/${selectedClientId}/sedes`, payload);
        toast.success('Sede registrada');
      } else if (editingSite) {
        await api.patch(`/sedes/${editingSite.id}`, { ...payload, status: siteForm.status });
        toast.success('Sede actualizada');
      }
      setSiteModal(null);
      invalidateSites();
      void queryClient.invalidateQueries({ queryKey: ['sites'] });
    } catch (err) {
      toast.error('No se pudo guardar la sede', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivateSite = async (site: Site) => {
    if (!window.confirm(`¿Desactivar la sede ${site.name}?`)) return;
    try {
      await api.delete(`/sedes/${site.id}`);
      toast.success('Sede desactivada');
      invalidateSites();
    } catch (err) {
      toast.error('No se pudo desactivar la sede', errorMessage(err));
    }
  };

  const openCreateAsset = () => {
    setAssetForm(EMPTY_ASSET);
    setEditingAsset(null);
    setAssetModal('create');
  };

  const openEditAsset = (asset: Asset) => {
    setAssetForm({
      code: asset.code,
      name: asset.name,
      assetType: asset.assetType ?? '',
      serialNumber: asset.serialNumber ?? '',
      status: asset.status,
    });
    setEditingAsset(asset);
    setAssetModal('edit');
  };

  const submitAsset = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSiteId) return;
    setSaving(true);
    try {
      const payload = {
        code: assetForm.code.trim(),
        name: assetForm.name.trim(),
        assetType: assetForm.assetType.trim() || null,
        serialNumber: assetForm.serialNumber.trim() || null,
      };
      if (assetModal === 'create') {
        await api.post(`/sedes/${selectedSiteId}/equipos`, payload);
        toast.success('Equipo registrado');
      } else if (editingAsset) {
        await api.patch(`/equipos/${editingAsset.id}`, { ...payload, status: assetForm.status });
        toast.success('Equipo actualizado');
      }
      setAssetModal(null);
      invalidateAssets();
    } catch (err) {
      toast.error('No se pudo guardar el equipo', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administración"
        title="Clientes y sedes"
        description="Empresas, ubicaciones y equipos cubiertos por el servicio."
        actions={
          canManage ? (
            <button type="button" className="btn btn-primary" onClick={openCreateClient}>
              Nuevo cliente
            </button>
          ) : undefined
        }
      />

      <div className="split-layout">
        <Card className="split-list">
          <div className="toolbar toolbar-stack">
            <input
              className="search-input"
              type="search"
              placeholder="Buscar cliente o RUC…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estado">
              <option value="">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>

          {clientsQuery.isLoading && <LoadingBlock label="Cargando clientes…" />}
          {clientsQuery.isError && <ErrorBlock error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} />}
          {clientsQuery.data && clientsQuery.data.data.length === 0 && (
            <EmptyBlock title="Sin clientes" description="No hay clientes que coincidan con la búsqueda." icon="building" />
          )}

          <ul className="entity-list">
            {clientsQuery.data?.data.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  className={cn('entity-item', client.id === selectedClientId && 'selected')}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <span className="entity-avatar">{client.businessName.slice(0, 2).toUpperCase()}</span>
                  <span className="entity-main">
                    <strong>{client.businessName}</strong>
                    <small>{client.ruc}</small>
                  </span>
                  <Badge tone={client.status === 'ACTIVO' ? 'success' : 'neutral'}>
                    {client.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>

          {clientsQuery.data && (
            <Pagination page={clientsQuery.data.meta.page} totalPages={clientsQuery.data.meta.totalPages} onChange={setPage} />
          )}
        </Card>

        <div className="split-detail">
          {!selectedClient && (
            <Card>
              <EmptyBlock title="Selecciona un cliente" description="Elige un cliente de la lista para gestionar sus sedes y equipos." icon="building" />
            </Card>
          )}

          {selectedClient && (
            <>
              <Card>
                <div className="card-heading row-between">
                  <div>
                    <span className="eyebrow">Cliente</span>
                    <h2>{selectedClient.businessName}</h2>
                    <p>{selectedClient.tradeName || 'Sin nombre comercial'} · RUC {selectedClient.ruc}</p>
                  </div>
                  {canManage && (
                    <div className="row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditClient(selectedClient)}>
                        Editar
                      </button>
                      {selectedClient.status === 'ACTIVO' && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => void deactivateClient(selectedClient)}>
                          Desactivar
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <dl className="inline-facts">
                  <div><dt>Correo</dt><dd>{selectedClient.email}</dd></div>
                  <div><dt>Teléfono</dt><dd>{selectedClient.phone || '—'}</dd></div>
                  <div><dt>Dirección</dt><dd>{selectedClient.address || '—'}</dd></div>
                  <div><dt>Registro</dt><dd>{formatDateTime(selectedClient.createdAt)}</dd></div>
                </dl>
              </Card>

              <Card>
                <div className="card-heading row-between">
                  <div>
                    <h2>Sedes</h2>
                    <p>Selecciona una sede para consultar sus equipos.</p>
                  </div>
                  {canManage && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={openCreateSite}>
                      Nueva sede
                    </button>
                  )}
                </div>

                {sitesQuery.isLoading && <LoadingBlock label="Cargando sedes…" />}
                {sitesQuery.isError && <ErrorBlock error={sitesQuery.error} onRetry={() => void sitesQuery.refetch()} />}
                {sitesQuery.data && sitesQuery.data.length === 0 && (
                  <p className="muted">Este cliente aún no tiene sedes registradas.</p>
                )}

                <div className="site-grid">
                  {sitesQuery.data?.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      className={cn('site-card', site.id === selectedSiteId && 'selected')}
                      onClick={() => setSelectedSiteId(site.id)}
                    >
                      <div className="row-between">
                        <strong>{site.name}</strong>
                        <Badge tone={site.status === 'ACTIVA' ? 'success' : 'neutral'}>
                          {site.status === 'ACTIVA' ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      <span>{site.address} · {site.city}</span>
                      <small>{site.contactName ? `${site.contactName} · ${site.contactPhone ?? 'sin teléfono'}` : 'Sin contacto registrado'}</small>
                      {canManage && (
                        <span className="site-actions" onClick={(event) => event.stopPropagation()}>
                          <button type="button" className="link-button" onClick={() => openEditSite(site)}>Editar</button>
                          {site.status === 'ACTIVA' && (
                            <button type="button" className="link-button danger" onClick={() => void deactivateSite(site)}>Desactivar</button>
                          )}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </Card>

              {selectedSite && (
                <Card>
                  <div className="card-heading row-between">
                    <div>
                      <h2>Equipos de {selectedSite.name}</h2>
                      <p>Activos asociados a esta ubicación.</p>
                    </div>
                    {canManage && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={openCreateAsset}>
                        Nuevo equipo
                      </button>
                    )}
                  </div>

                  {assetsQuery.isLoading && <LoadingBlock label="Cargando equipos…" />}
                  {assetsQuery.isError && <ErrorBlock error={assetsQuery.error} onRetry={() => void assetsQuery.refetch()} />}
                  {assetsQuery.data && assetsQuery.data.length === 0 && (
                    <p className="muted">No hay equipos registrados en esta sede.</p>
                  )}
                  {assetsQuery.data && assetsQuery.data.length > 0 && (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Equipo</th>
                            <th>Tipo</th>
                            <th>Serie</th>
                            <th>Estado</th>
                            {canManage && <th className="align-right">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {assetsQuery.data.map((asset) => (
                            <tr key={asset.id}>
                              <td><strong>{asset.code}</strong></td>
                              <td>{asset.name}</td>
                              <td>{asset.assetType || '—'}</td>
                              <td>{asset.serialNumber || '—'}</td>
                              <td>
                                <Badge tone={asset.status === 'OPERATIVO' ? 'success' : 'danger'}>
                                  {asset.status === 'OPERATIVO' ? 'Operativo' : 'Fuera de servicio'}
                                </Badge>
                              </td>
                              {canManage && (
                                <td className="align-right">
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditAsset(asset)}>
                                    Editar
                                  </button>
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
            </>
          )}
        </div>
      </div>

      <Modal
        open={clientModal !== null}
        title={clientModal === 'create' ? 'Nuevo cliente' : 'Editar cliente'}
        onClose={() => setClientModal(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setClientModal(null)}>Cancelar</button>
            <button type="submit" form="client-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="client-form" className="form-stack" onSubmit={submitClient}>
          <div className="form-row">
            <label className="field">
              <span>RUC</span>
              <input
                value={clientForm.ruc}
                onChange={(event) => setClientForm({ ...clientForm, ruc: event.target.value })}
                pattern="\d{13}"
                maxLength={13}
                placeholder="13 dígitos"
                required
              />
            </label>
            <label className="field">
              <span>Razón social</span>
              <input
                value={clientForm.businessName}
                onChange={(event) => setClientForm({ ...clientForm, businessName: event.target.value })}
                minLength={3}
                maxLength={160}
                required
              />
            </label>
          </div>
          <label className="field">
            <span>Nombre comercial</span>
            <input
              value={clientForm.tradeName}
              onChange={(event) => setClientForm({ ...clientForm, tradeName: event.target.value })}
              maxLength={160}
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Correo</span>
              <input
                type="email"
                value={clientForm.email}
                onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input
                value={clientForm.phone}
                onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })}
                maxLength={20}
              />
            </label>
          </div>
          <label className="field">
            <span>Dirección</span>
            <input
              value={clientForm.address}
              onChange={(event) => setClientForm({ ...clientForm, address: event.target.value })}
              maxLength={500}
            />
          </label>
          {clientModal === 'edit' && (
            <label className="field">
              <span>Estado</span>
              <select
                value={clientForm.status}
                onChange={(event) => setClientForm({ ...clientForm, status: event.target.value as ClientFormState['status'] })}
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </label>
          )}
        </form>
      </Modal>

      <Modal
        open={siteModal !== null}
        title={siteModal === 'create' ? 'Nueva sede' : 'Editar sede'}
        onClose={() => setSiteModal(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setSiteModal(null)}>Cancelar</button>
            <button type="submit" form="site-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="site-form" className="form-stack" onSubmit={submitSite}>
          <div className="form-row">
            <label className="field">
              <span>Nombre de la sede</span>
              <input
                value={siteForm.name}
                onChange={(event) => setSiteForm({ ...siteForm, name: event.target.value })}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label className="field">
              <span>Ciudad</span>
              <input
                value={siteForm.city}
                onChange={(event) => setSiteForm({ ...siteForm, city: event.target.value })}
                maxLength={80}
                required
              />
            </label>
          </div>
          <label className="field">
            <span>Dirección</span>
            <input
              value={siteForm.address}
              onChange={(event) => setSiteForm({ ...siteForm, address: event.target.value })}
              minLength={5}
              maxLength={500}
              required
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Contacto</span>
              <input
                value={siteForm.contactName}
                onChange={(event) => setSiteForm({ ...siteForm, contactName: event.target.value })}
                maxLength={120}
              />
            </label>
            <label className="field">
              <span>Teléfono de contacto</span>
              <input
                value={siteForm.contactPhone}
                onChange={(event) => setSiteForm({ ...siteForm, contactPhone: event.target.value })}
                maxLength={20}
              />
            </label>
          </div>
          {siteModal === 'edit' && (
            <label className="field">
              <span>Estado</span>
              <select
                value={siteForm.status}
                onChange={(event) => setSiteForm({ ...siteForm, status: event.target.value as SiteFormState['status'] })}
              >
                <option value="ACTIVA">Activa</option>
                <option value="INACTIVA">Inactiva</option>
              </select>
            </label>
          )}
        </form>
      </Modal>

      <Modal
        open={assetModal !== null}
        title={assetModal === 'create' ? 'Nuevo equipo' : 'Editar equipo'}
        onClose={() => setAssetModal(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAssetModal(null)}>Cancelar</button>
            <button type="submit" form="asset-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="asset-form" className="form-stack" onSubmit={submitAsset}>
          <div className="form-row">
            <label className="field">
              <span>Código</span>
              <input
                value={assetForm.code}
                onChange={(event) => setAssetForm({ ...assetForm, code: event.target.value })}
                minLength={2}
                maxLength={40}
                required
              />
            </label>
            <label className="field">
              <span>Nombre</span>
              <input
                value={assetForm.name}
                onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Tipo de equipo</span>
              <input
                value={assetForm.assetType}
                onChange={(event) => setAssetForm({ ...assetForm, assetType: event.target.value })}
                maxLength={60}
              />
            </label>
            <label className="field">
              <span>Número de serie</span>
              <input
                value={assetForm.serialNumber}
                onChange={(event) => setAssetForm({ ...assetForm, serialNumber: event.target.value })}
                maxLength={80}
              />
            </label>
          </div>
          {assetModal === 'edit' && (
            <label className="field">
              <span>Estado</span>
              <select
                value={assetForm.status}
                onChange={(event) => setAssetForm({ ...assetForm, status: event.target.value as AssetFormState['status'] })}
              >
                <option value="OPERATIVO">Operativo</option>
                <option value="FUERA_SERVICIO">Fuera de servicio</option>
              </select>
            </label>
          )}
        </form>
      </Modal>
    </div>
  );
}
