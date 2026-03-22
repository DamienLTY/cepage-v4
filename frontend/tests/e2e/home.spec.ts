/**
 * Tests E2E — Page d'accueil
 */
import { test, expect } from '@playwright/test';

test.describe('Page Accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('affiche le titre Cépage', async ({ page }) => {
    await expect(page.locator('.logo-text')).toContainText('Cépage');
  });

  test('affiche le bouton Mode Visite ou Événements', async ({ page }) => {
    // Au moins l'un des 2 CTA principaux doit être visible
    const cta = page.getByRole('button', { name: /visite|événements|balade/i });
    await expect(cta.first()).toBeVisible();
  });

  test('le menu hamburger ouvre la sidebar', async ({ page }) => {
    const hamburger = page.locator('.hamburger');
    await hamburger.click();
    await expect(page.locator('.sidebar')).toHaveClass(/open/);
  });

  test('naviguer vers Événements depuis la sidebar', async ({ page }) => {
    await page.locator('.hamburger').click();
    await page.locator('.sidebar').getByRole('button', { name: 'Événements' }).click();
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
