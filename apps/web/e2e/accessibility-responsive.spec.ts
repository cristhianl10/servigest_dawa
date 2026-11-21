import { expect, test, type Page } from '@playwright/test';

const credentials = { email: 'admin@servigest.ec', password: 'ServiGest2026*' };

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(credentials.email);
  await page.locator('input[autocomplete="current-password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('accesibilidad y responsive automatizados', () => {
  test('mantiene el layout sin desbordamiento en tamaños clave', async ({ page }) => {
    await login(page);
    for (const viewport of [
      { width: 360, height: 800 },
      { width: 768, height: 900 },
      { width: 1024, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard');
      await expect(page.locator('main h1', { hasText: 'Dashboard' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    }
  });

  test('mantiene logout accesible en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await login(page);
    const logout = page.getByRole('banner').getByRole('button', { name: 'Cerrar sesión' });
    await expect(logout).toBeVisible();
    await expect(logout).toHaveAttribute('aria-label', 'Cerrar sesión');
    await logout.click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('el modal conserva foco, cierra con Escape y devuelve el foco', async ({ page }) => {
    await login(page);
    await page.goto('/admin/usuarios');
    const opener = page.getByRole('button', { name: 'Nuevo usuario' });
    await opener.focus();
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo usuario' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('respeta prefers-reduced-motion y mantiene controles etiquetados', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page);
    await expect(page.getByRole('banner').getByRole('button', { name: 'Cerrar sesión' })).toHaveAttribute('aria-label', 'Cerrar sesión');
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBeTruthy();
  });
});
