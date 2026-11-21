import { expect, test, type APIRequestContext } from '@playwright/test';
import { createHmac } from 'node:crypto';

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api';
const password = 'ServiGest2026*';
const users = {
  admin: 'admin@servigest.ec',
  coordinator: 'coordinador@servigest.ec',
  technician: 'tecnico@servigest.ec',
  client: 'cliente@servigest.ec',
};

function expiredToken(): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: 'expired-e2e', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 });
  const content = `${header}.${payload}`;
  const signature = createHmac('sha256', 'super_secret_jwt_key_servigest_2026_dawa_development_only')
    .update(content)
    .digest('base64url');
  return `${content}.${signature}`;
}

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

  for (const path of [
    '/especialidades',
    '/categorias-servicio',
    '/estados',
    '/parametros',
    '/feriados',
    '/notificaciones',
    '/roles',
  ]) {
    await expect(status(request, admin, path)).resolves.toBe(200);
    await expect(status(request, client, path)).resolves.toBe(200);
  }

  for (const path of ['/dashboard/carga-tecnicos', '/dashboard/evolucion']) {
    expect([200, 400, 422]).toContain(await status(request, admin, path));
    expect([200, 400, 422]).toContain(await status(request, coordinator, path));
    await expect(status(request, technician, path)).resolves.toBe(403);
    await expect(status(request, client, path)).resolves.toBe(403);
  }

  expect([200, 422]).toContain(await status(request, technician, '/dashboard/mi-resumen'));
  expect([200, 422]).toContain(await status(request, client, '/dashboard/mi-resumen'));
  await expect(status(request, admin, '/dashboard/mi-resumen')).resolves.toBe(403);

  for (const path of ['/usuarios', '/tecnicos', '/clientes']) {
    await expect(status(request, client, path, 'POST')).resolves.toBe(403);
    await expect(status(request, technician, path, 'POST')).resolves.toBe(403);
  }

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

  await expect(status(request, 'not-a-jwt', '/usuarios')).resolves.toBe(401);
  await expect(status(request, 'eyJhbGciOiJIUzI1NiJ9.invalid.signature', '/usuarios')).resolves.toBe(401);
  await expect(status(request, expiredToken(), '/usuarios')).resolves.toBe(401);
});
