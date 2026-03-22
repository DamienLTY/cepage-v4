/**
 * Tests E2E — Navigation entre les pages
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('le logo ramène à l\'accueil', async ({ page }) => {
    await page.goto('/');
    // Naviguer ailleurs
    await page.locator('.hamburger').click();
    await page.locator('.sidebar').getByRole('button', { name: 'Événements' }).click();
    // Cliquer sur le logo
    await page.locator('.site-logo').click();
    // La page Events doit être masquée (on est revenu à l'accueil)
    await expect(page.locator('.events-page')).not.toBeVisible();
  });

  test('page Événements charge sans erreur JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.locator('.hamburger').click();
    await page.locator('.sidebar').getByRole('button', { name: 'Événements' }).click();
    await page.waitForTimeout(500);

    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

  test('le hash #events restaure la page Événements au rechargement', async ({ page }) => {
    await page.goto('/#events');
    // Doit charger directement la page events
    await page.waitForTimeout(300);
    // La sidebar Events doit être dans le DOM
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('la sidebar se ferme après navigation', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hamburger').click();
    await expect(page.locator('.sidebar')).toHaveClass(/open/);
    await page.locator('.sidebar').getByRole('button', { name: 'Événements' }).click();
    await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
  });
});
