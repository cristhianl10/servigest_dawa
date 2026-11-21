import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api';
const password = 'ServiGest2026*';
const users = {
  client: 'cliente@servigest.ec',
  coordinator: 'coordinador@servigest.ec',
  technician: 'tecnico@servigest.ec',
};

type Session = { accessToken: string; user: { id: string; role: string } };

async function login(api: APIRequestContext, email: string): Promise<Session> {
  const response = await api.post(`${API_URL}/auth/login`, { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data;
}

async function apiRequest(
  api: APIRequestContext,
  token: string,
  path: string,
  options: { method?: string; data?: unknown } = {}
) {
  const response = await api.fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    data: options.data,
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `${options.method ?? 'GET'} ${path} failed`).toBeTruthy();
  return response.json();
}

async function loginInBrowser(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('E2E-01: registro, asignación, atención y trazabilidad', async ({ page, request }) => {
  const client = await login(request, users.client);
  const coordinator = await login(request, users.coordinator);
  const technician = await login(request, users.technician);

  const created = await apiRequest(request, client.accessToken, '/solicitudes', {
    method: 'POST',
    data: {
      siteId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      assetId: 'e1111111-1111-1111-1111-111111111111',
      categoryId: 1,
      priority: 'ALTA',
      description: `E2E ${Date.now()} — interrupción de conectividad en la sede principal.`,
    },
  });
  const requestId = created.data.id as string;
  const requestCode = created.data.code as string;
  expect(created.data.status).toBe('REGISTRADA');

  await loginInBrowser(page, users.client);
  await page.goto('/solicitudes');
  await expect(page.getByText(requestCode)).toBeVisible();

  const approved = await apiRequest(request, coordinator.accessToken, `/solicitudes/${requestId}/estado`, {
    method: 'PATCH',
    data: { action: 'aprobar', version: created.data.version },
  });
  expect(approved.data.status).toBe('APROBADA');

  const assigned = await apiRequest(request, coordinator.accessToken, `/solicitudes/${requestId}/asignaciones`, {
    method: 'POST',
    data: {
      technicianId: '11111111-aaaa-aaaa-aaaa-111111111111',
      version: approved.data.version,
    },
  });
  expect(assigned.data.status).toBe('VIGENTE');

  const started = await apiRequest(request, technician.accessToken, `/solicitudes/${requestId}/estado`, {
    method: 'PATCH',
    data: { action: 'iniciar', version: approved.data.version + 1 },
  });
  expect(started.data.status).toBe('EN_PROCESO');

  const resolved = await apiRequest(request, technician.accessToken, `/solicitudes/${requestId}/estado`, {
    method: 'PATCH',
    data: {
      action: 'resolver',
      version: started.data.version,
      resolution: 'Se reemplazó el enlace defectuoso y se validó conectividad estable.',
    },
  });
  expect(resolved.data.status).toBe('RESUELTA');

  await expect(page.locator('.nav-badge')).toBeVisible({ timeout: 10_000 });

  const history = await apiRequest(request, client.accessToken, `/solicitudes/${requestId}/historial`);
  expect(history.data.length).toBeGreaterThanOrEqual(5);
  expect(history.data.map((item: { toStatus: string }) => item.toStatus)).toEqual(
    expect.arrayContaining(['REGISTRADA', 'APROBADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA'])
  );
});

test('E2E-02: consulta, cierre, bloqueo y reapertura auditada', async ({ page, request }) => {
  const client = await login(request, users.client);
  const coordinator = await login(request, users.coordinator);
  const technician = await login(request, users.technician);

  const created = await apiRequest(request, client.accessToken, '/solicitudes', {
    method: 'POST',
    data: {
      siteId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      categoryId: 1,
      priority: 'MEDIA',
      description: `E2E ${Date.now()} — revisión de punto de red para cierre y reapertura.`,
    },
  });
  const requestId = created.data.id as string;

  const approved = await apiRequest(request, coordinator.accessToken, `/solicitudes/${requestId}/estado`, {
    method: 'PATCH',
    data: { action: 'aprobar', version: created.data.version },
  });
  await apiRequest(request, coordinator.accessToken, `/solicitudes/${requestId}/asignaciones`, {
    method: 'POST',
    data: { technicianId: '11111111-aaaa-aaaa-aaaa-111111111111', version: approved.data.version },
  });
  const started = await apiRequest(request, technician.accessToken, `/solicitudes/${requestId}/estado`, {
    method: 'PATCH',
    data: { action: 'iniciar', version: approved.data.version + 1 },
  });
  const resolved = await apiRequest(request, technician.accessToken, `/solicitudes/${requestId}/estado`, {
    method: 'PATCH',
    data: {
      action: 'resolver',
      version: started.data.version,
      resolution: 'Se corrigió el punto de red y se comprobó la disponibilidad del servicio.',
    },
  });

  await loginInBrowser(page, users.client);
  await page.goto(`/solicitudes/${requestId}`);
  await expect(page.locator('.status-resuelta').first()).toBeVisible();

  const closed = await apiRequest(request, client.accessToken, `/solicitudes/${requestId}/estado`, {
    method: 'PATCH',
    data: { action: 'cerrar', version: resolved.data.version },
  });
  expect(closed.data.status).toBe('CERRADA');

  const forbidden = await request.patch(`${API_URL}/solicitudes/${requestId}/estado`, {
    data: { action: 'iniciar', version: closed.data.version },
    headers: { Authorization: `Bearer ${client.accessToken}` },
  });
  expect(forbidden.status()).toBe(409);

  const reopened = await apiRequest(request, coordinator.accessToken, `/solicitudes/${requestId}/reabrir`, {
    method: 'POST',
    data: {
      version: closed.data.version,
      reason: 'El cliente reportó que la falla volvió a presentarse y requiere nueva atención.',
    },
  });
  expect(reopened.data.status).toBe('APROBADA');

  const history = await apiRequest(request, client.accessToken, `/solicitudes/${requestId}/historial`);
  expect(history.data.map((item: { action: string }) => item.action)).toContain('REAPERTURA');
});
