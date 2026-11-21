import { expect, test } from '@playwright/test';

const credentials = {
  email: 'admin@servigest.ec',
  password: 'ServiGest2026*',
};

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
});
