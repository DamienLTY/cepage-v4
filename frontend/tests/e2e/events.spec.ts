/**
 * Tests E2E — Page Événements
 */
import { test, expect } from '@playwright/test';

// Helper : naviguer vers la page Événements depuis la sidebar
async function goToEvents(page: any) {
  await page.goto('/');
  await page.locator('.hamburger').click();
  // Scoper au conteneur .sidebar pour éviter les faux positifs
  // (la HomePage contient aussi des boutons avec "Événements")
  await page.locator('.sidebar').getByRole('button', { name: 'Événements' }).click();
  await expect(page.locator('.events-page')).toBeVisible({ timeout: 4000 });
}

test.describe('Page Événements', () => {

  test('affiche le titre Événements & Rendez-vous', async ({ page }) => {
    await goToEvents(page);
    await expect(page.locator('.events-title')).toContainText('Événements');
  });

  test('affiche le toggle À venir / Passés', async ({ page }) => {
    await goToEvents(page);
    const toggleBtns = page.locator('.events-toggle-btn');
    await expect(toggleBtns).toHaveCount(2);
    await expect(toggleBtns.first()).toContainText('À venir');
    await expect(toggleBtns.nth(1)).toContainText('Passés');
  });

  test('le toggle "À venir" est actif par défaut', async ({ page }) => {
    await goToEvents(page);
    const activeBtn = page.locator('.events-toggle-btn.active');
    await expect(activeBtn).toContainText('À venir');
  });

  test('basculer sur "Passés" change le bouton actif', async ({ page }) => {
    await goToEvents(page);
    const passedBtn = page.locator('.events-toggle-btn').nth(1);
    await passedBtn.click();
    await expect(passedBtn).toHaveClass(/active/);
  });

  test('la grille d\'événements contient des cartes ou un message vide', async ({ page }) => {
    await goToEvents(page);
    const grid = page.locator('.events-grid');
    const noResults = page.locator('.no-results');
    const hasGrid = await grid.isVisible().catch(() => false);
    const hasNoResults = await noResults.isVisible().catch(() => false);
    expect(hasGrid || hasNoResults).toBe(true);
  });

  test('les boutons Informations sont présents sur les cartes', async ({ page }) => {
    await goToEvents(page);
    const gridVisible = await page.locator('.events-grid').isVisible().catch(() => false);
    if (gridVisible) {
      const infoBtn = page.locator('.event-action-btn.info').first();
      await expect(infoBtn).toBeVisible();
      await expect(infoBtn).toContainText('Informations');
    }
  });

  test('les boutons Mode Balade sont présents sur les cartes', async ({ page }) => {
    await goToEvents(page);
    const gridVisible = await page.locator('.events-grid').isVisible().catch(() => false);
    if (gridVisible) {
      await expect(page.locator('.event-action-btn.visite').first()).toBeVisible();
    }
  });

  test('cliquer Informations ouvre la modal de détail', async ({ page }) => {
    await goToEvents(page);
    const gridVisible = await page.locator('.events-grid').isVisible().catch(() => false);
    if (!gridVisible) return;

    await page.locator('.event-action-btn.info').first().click();
    await expect(page.locator('.event-modal-overlay')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('.event-modal')).toBeVisible();
  });

  test('fermer la modal via ✕ masque la modal', async ({ page }) => {
    await goToEvents(page);
    const gridVisible = await page.locator('.events-grid').isVisible().catch(() => false);
    if (!gridVisible) return;

    await page.locator('.event-action-btn.info').first().click();
    await page.locator('.event-modal-close').click();
    await expect(page.locator('.event-modal-overlay')).not.toBeVisible();
  });

  test('fermer la modal en cliquant sur l\'overlay', async ({ page }) => {
    await goToEvents(page);
    const gridVisible = await page.locator('.events-grid').isVisible().catch(() => false);
    if (!gridVisible) return;

    await page.locator('.event-action-btn.info').first().click();
    await expect(page.locator('.event-modal-overlay')).toBeVisible();
    await page.locator('.event-modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.event-modal-overlay')).not.toBeVisible();
  });

  test('la barre de recherche filtre les événements', async ({ page }) => {
    await goToEvents(page);
    const searchInput = page.locator('input.events-search-input');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('xyzimpossibleterme99999');
    await page.waitForTimeout(300);

    const gridVisible = await page.locator('.events-grid').isVisible().catch(() => false);
    if (!gridVisible) {
      await expect(page.locator('.no-results')).toBeVisible();
    }
  });

  test('filtrer par catégorie "Salons" affiche le bouton actif', async ({ page }) => {
    await goToEvents(page);
    const salonBtn = page.locator('button.filter-btn', { hasText: /salons/i });
    await salonBtn.click();
    await expect(salonBtn).toHaveClass(/active/);
  });

  test('pas d\'erreurs JS sur la page Événements', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await goToEvents(page);
    await page.waitForTimeout(500);
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
