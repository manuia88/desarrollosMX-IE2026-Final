import { expect, test } from '@playwright/test';

// 9.E.2 — Smoke tests FASE 09 IE N1.
// Target: /ie-playground (dev-only — devuelve 404 en production).
// Fixture data mockeada in-page; no dependencia de tRPC real.

test.describe('FASE 09 N1 · IntelligenceCard smoke', () => {
  test('renderiza playground + ≥3 IntelligenceCard entries', async ({ page }) => {
    await page.goto('/ie-playground');
    await expect(page.getByTestId('ie-playground-title')).toBeVisible();
    const cards = page.getByTestId('ie-playground-cards').locator('article');
    await expect(cards).toHaveCount(3);
    await expect(page.getByRole('heading', { name: /Life Quality Index/i })).toBeVisible();
  });

  test('Ver detalle abre ScoreTransparencyPanel con metodología', async ({ page }) => {
    await page.goto('/ie-playground');
    const openers = page.getByRole('button', { name: /Ver detalle/i });
    await openers.first().click();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /Metodología/i }),
    ).toBeVisible({ timeout: 4000 });
  });

  test('tier-gated score muestra ScorePlaceholder con requirement', async ({ page }) => {
    await page.goto('/ie-playground');
    const placeholder = page.locator('[data-score-id="H14"]');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText(/Requiere señales/i);
  });

  test('ScoreRecommendationsCard aparece al click recomendaciones', async ({ page }) => {
    await page.goto('/ie-playground');
    const recButtons = page
      .getByTestId('ie-playground-cards')
      .getByRole('button', { name: /recomendacion|Ver/i });
    const recBtn = recButtons.nth(1);
    await recBtn.click();
    await expect(
      page.getByText(/Precio 10% sobre AVM|Zona excelente|Áreas de oportunidad/i),
    ).toBeVisible({ timeout: 4000 });
  });
});
