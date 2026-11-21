import { expect, test, type APIRequestContext } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api';
const password = 'ServiGest2026*';
const users = {
  admin: 'admin@servigest.ec',
  coordinator: 'coordinador@servigest.ec',
  technician: 'tecnico@servigest.ec',
  client: 'cliente@servigest.ec',
};

async function token(api: APIRequestContext, email: string): Promise<string> {
  const response = await api.post(`${API_URL}/auth/login`, { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.accessToken;
}

async function status(
  api: APIRequestContext,
  accessToken: string | undefined,
  path: string,
  method = 'GET'
): Promise<number> {
  const response = await api.fetch(`${API_URL}${path}`, {
    method,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.status();
}

test('matriz de autorización por rol e IDOR', async ({ request }) => {
  const admin = await token(request, users.admin);
  const coordinator = await token(request, users.coordinator);
  const technician = await token(request, users.technician);
  const client = await token(request, users.client);

  await expect(status(request, undefined, '/usuarios')).resolves.toBe(401);
  await expect(status(request, admin, '/usuarios')).resolves.toBe(200);
  await expect(status(request, coordinator, '/usuarios')).resolves.toBe(403);
  await expect(status(request, technician, '/usuarios')).resolves.toBe(403);
  await expect(status(request, client, '/usuarios')).resolves.toBe(403);

  expect([400, 422]).toContain(await status(request, admin, '/dashboard/indicadores'));
  expect([400, 422]).toContain(await status(request, coordinator, '/dashboard/indicadores'));
  await expect(status(request, technician, '/dashboard/indicadores')).resolves.toBe(403);
  await expect(status(request, client, '/dashboard/indicadores')).resolves.toBe(403);

  await expect(status(request, admin, '/clientes')).resolves.toBe(200);
  await expect(status(request, coordinator, '/clientes')).resolves.toBe(200);
  await expect(status(request, client, '/clientes')).resolves.toBe(403);

  await expect(status(request, admin, '/solicitudes')).resolves.toBe(200);
  await expect(status(request, coordinator, '/solicitudes')).resolves.toBe(200);
  await expect(status(request, technician, '/solicitudes')).resolves.toBe(200);
  await expect(status(request, client, '/solicitudes')).resolves.toBe(200);

  // Solicitud seed del cliente: un técnico no asignado no puede leerla por IDOR.
  const seededRequest = '/solicitudes/22222222-aaaa-aaaa-aaaa-222222222222';
  await expect(status(request, client, seededRequest)).resolves.toBe(200);
  await expect(status(request, technician, seededRequest)).resolves.toBe(404);
  await expect(status(request, coordinator, `${seededRequest}/historial`)).resolves.toBe(200);
  await expect(status(request, technician, `${seededRequest}/historial`)).resolves.toBe(404);
});
