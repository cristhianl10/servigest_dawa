import { expect, test } from '@playwright/test';
import { createHmac } from 'node:crypto';

const credentials = {
  email: 'admin@servigest.ec',
  password: 'ServiGest2026*',
};
const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api';

function expiredAccessToken(): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: 'expired-e2e', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 });
  const content = `${header}.${payload}`;
  const signature = createHmac('sha256', 'super_secret_jwt_key_servigest_2026_dawa_development_only')
    .update(content)
    .digest('base64url');
  return `${content}.${signature}`;
}

test.describe('E2E de autenticación y sesión', () => {
  test('login permite mostrar la contraseña y acceder al dashboard', async ({ page }) => {
    await page.goto('/login');

    const password = page.locator('input[autocomplete="current-password"]');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Ocultar contraseña' })).toBeVisible();

    await page.getByLabel('Correo electrónico').fill(credentials.email);
    await password.fill(credentials.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('main h1', { hasText: 'Dashboard' })).toBeVisible();
  });

  test('cerrar sesión limpia la sesión y devuelve al login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(credentials.email);
    await page.locator('input[autocomplete="current-password"]').fill(credentials.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('banner').getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('renueva la sesión, rota el refresh token y lo invalida al cerrar sesión', async ({ request }) => {
    const login = await request.post(`${API_URL}/auth/login`, { data: credentials });
    expect(login.ok()).toBeTruthy();

    const refreshed = await request.post(`${API_URL}/auth/refresh`);
    expect(refreshed.status()).toBe(200);
    expect((await refreshed.json()).data.accessToken).toBeTruthy();

    const logout = await request.post(`${API_URL}/auth/logout`);
    expect(logout.status()).toBe(204);

    const afterLogout = await request.post(`${API_URL}/auth/refresh`);
    expect(afterLogout.status()).toBe(401);
  });

  test('recuperación de contraseña no revela si el correo existe', async ({ request }) => {
    const known = await request.post(`${API_URL}/auth/forgot-password`, {
      data: { email: credentials.email },
    });
    const unknown = await request.post(`${API_URL}/auth/forgot-password`, {
      data: { email: 'no-existe@servigest.ec' },
    });

    expect(known.status()).toBe(202);
    expect(unknown.status()).toBe(202);
    expect((await known.json()).data.message).toBe((await unknown.json()).data.message);
  });

  test('renueva automáticamente al recibir un access token expirado', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(credentials.email);
    await page.locator('input[autocomplete="current-password"]').fill(credentials.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    let expiredRequest = true;
    await page.route('**/api/auth/me', async (route) => {
      if (!expiredRequest) return route.continue();
      expiredRequest = false;
      return route.continue({ headers: { ...route.request().headers(), authorization: `Bearer ${expiredAccessToken()}` } });
    });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('main h1', { hasText: 'Dashboard' })).toBeVisible();
  });
});
