import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PRIORITIES, type Priority } from '@servigest/shared';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { ErrorBlock, LoadingBlock } from '../components/Feedback';
import { PageHeader, Card } from '../components/Ui';
import { api } from '../lib/api';
import type { Asset, Client, RequestSummary, ServiceCategory, Site } from '../lib/types';
import { PRIORITY_LABELS, errorMessage } from '../lib/utils';

export function NewRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isManager = user?.role === 'ADMIN' || user?.role === 'COORDINADOR';

  const [clientId, setClientId] = useState(user?.clientId ?? '');
  const [siteId, setSiteId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIA');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ['clients', 'options'],
    queryFn: () => api.list<Client>('/clientes?page=1&pageSize=100&status=ACTIVO'),
    enabled: isManager,
  });

  const sitesQuery = useQuery({
    queryKey: ['sites', clientId],
    queryFn: () => api.get<Site[]>(`/clientes/${clientId}/sedes`),
    enabled: Boolean(clientId),
  });

  const assetsQuery = useQuery({
    queryKey: ['assets', siteId],
    queryFn: () => api.get<Asset[]>(`/sedes/${siteId}/equipos`),
    enabled: Boolean(siteId),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => api.get<ServiceCategory[]>('/categorias-servicio'),
  });

  const sites = useMemo(
    () => (sitesQuery.data ?? []).filter((site) => site.status === 'ACTIVA'),
    [sitesQuery.data]
  );
  const assets = useMemo(
    () => (assetsQuery.data ?? []).filter((asset) => asset.status === 'OPERATIVO'),
    [assetsQuery.data]
  );
  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.status === 'ACTIVA'),
    [categoriesQuery.data]
  );

  useEffect(() => {
    setSiteId('');
    setAssetId('');
  }, [clientId]);

  useEffect(() => {
    setAssetId('');
  }, [siteId]);

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(String(categories[0].id));
    }
  }, [categories, categoryId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!siteId) {
      toast.error('Selecciona una sede');
      return;
    }
    if (!categoryId) {
      toast.error('Selecciona una categoría');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.post<RequestSummary>('/solicitudes', {
        siteId,
        assetId: assetId || null,
        categoryId: Number(categoryId),
        priority,
        description: description.trim(),
      });
      toast.success('Solicitud registrada', created.code);
      navigate(`/solicitudes/${created.id}`);
    } catch (err) {
      toast.error('No se pudo registrar la solicitud', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const loadingOptions = clientsQuery.isLoading || sitesQuery.isLoading || categoriesQuery.isLoading;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Registro"
        title="Nueva solicitud"
        description="Describe la necesidad con el mayor detalle posible. El SLA se calcula automáticamente."
      />

      <div className="grid grid-form">
        <Card>
          {loadingOptions && <LoadingBlock label="Cargando catálogos y sedes…" />}
          {(clientsQuery.isError || sitesQuery.isError || categoriesQuery.isError) && (
            <ErrorBlock
              error={clientsQuery.error ?? sitesQuery.error ?? categoriesQuery.error}
              onRetry={() => {
                void clientsQuery.refetch();
                void sitesQuery.refetch();
                void categoriesQuery.refetch();
              }}
            />
          )}

          <form onSubmit={handleSubmit} className="form-stack">
            {isManager && (
              <label className="field">
                <span>Cliente</span>
                <select
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  required
                >
                  <option value="">Selecciona un cliente…</option>
                  {clientsQuery.data?.data.map((client) => (
                    <option key={client.id} value={client.id}>{client.businessName}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="form-row">
              <label className="field">
                <span>Sede</span>
                <select
                  value={siteId}
                  onChange={(event) => setSiteId(event.target.value)}
                  required
                  disabled={!clientId}
                >
                  <option value="">{clientId ? 'Selecciona una sede…' : 'Primero elige un cliente'}</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name} — {site.city}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Equipo (opcional)</span>
                <select
                  value={assetId}
                  onChange={(event) => setAssetId(event.target.value)}
                  disabled={!siteId}
                >
                  <option value="">Sin equipo específico</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.code} — {asset.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label className="field">
                <span>Categoría</span>
                <select
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    const category = categories.find((item) => item.id === Number(event.target.value));
                    if (category) setPriority(category.defaultPriority);
                  }}
                  required
                >
                  <option value="">Selecciona una categoría…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Prioridad</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                  {PRIORITIES.map((item) => (
                    <option key={item} value={item}>{PRIORITY_LABELS[item]}</option>
                  ))}
                </select>
                <small>La prioridad sugerida proviene de la categoría.</small>
              </label>
            </div>

            <label className="field">
              <span>Descripción</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={7}
                minLength={20}
                maxLength={2000}
                required
                placeholder="Detalla el problema, el impacto y cualquier contexto útil para el técnico…"
              />
              <small>{description.length}/2000 caracteres · mínimo 20</small>
            </label>

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting || loadingOptions}>
                {submitting ? 'Registrando…' : 'Registrar solicitud'}
              </button>
            </div>
          </form>
        </Card>

        <aside className="side-panel">
          <Card>
            <h2>Cómo priorizamos</h2>
            <ul className="info-list">
              <li><strong>Crítica:</strong> operación detenida. SLA de 4 horas.</li>
              <li><strong>Alta:</strong> afectación relevante. SLA de 8 horas.</li>
              <li><strong>Media:</strong> atención programada. SLA de 24 horas.</li>
              <li><strong>Baja:</strong> mejora o consulta. SLA de 72 horas.</li>
            </ul>
          </Card>
          <Card>
            <h2>Buenas prácticas</h2>
            <ul className="info-list">
              <li>Indica desde cuándo ocurre la falla.</li>
              <li>Describe si afecta a más usuarios o sedes.</li>
              <li>Adjunta fotos o PDF después de registrar la solicitud.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
