import { expect, test } from '@playwright/test';

// STUB — activar en B.1 cuando UI canónica M01 ficha colonia shipped + 3 disclosure bugs P0 fixed.
// L-NEW IDs:
//   - L-NEW-DEMO-DISCLOSURE-S5      Atlas Wiki Haiku narrative cita synthetic como "INEGI"
//   - L-NEW-DEMO-DISCLOSURE-A3-01   UI ficha colonia consume sintético sin badge "Estimación H1"
//   - L-NEW-CLIMATE-DISCLOSURE-01   Climate UI badge "Modelo SEED H1" hasta NOAA real ingest
// Refs:
//   - docs/08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md §3.4 + §6.2
//   - docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md (4 señales STUB)
//   - docs/01_DECISIONES_ARQUITECTONICAS/ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md
//   - docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md (M01 0% confirmado)
// Activation steps B.1:
//   1) Implementar app/[locale]/(public)/zonas/[colonia]/page.tsx (o equivalente M01 ficha colonia).
//   2) Wire data-testids: demographics-disclosure-badge, climate-disclosure-badge,
//      atlas-wiki-narrative, atlas-wiki-disclosure-flag, str-source-attribution,
//      zone-name-header, zone-data-freshness-indicator.
//   3) Cambiar test.describe.skip → test.describe.
//   4) Validar 3 disclosure bugs P0 fixed en CI.

test.describe
  .skip('zone data freshness disclosure (B.1 ready)', () => {
    const COLONIA_SLUG = 'colonia-roma-norte';

    test.beforeEach(async ({ page }) => {
      await page.goto(`/zonas/${COLONIA_SLUG}`);
      await page.waitForLoadState('networkidle');
    });

    test('demographics card muestra badge "Estimación H1" sobre datos synthetic v1', async ({
      page,
    }) => {
      const badge = page.getByTestId('demographics-disclosure-badge');
      await expect(badge).toBeVisible();
      await expect(badge).toContainText(/Estimación H1|baseline sintético/i);
      await expect(badge).toHaveAttribute('aria-label', /sintético|not_ground_truth|baseline/i);
    });

    test('climate card muestra badge "Modelo SEED H1" hasta NOAA real ingest', async ({ page }) => {
      const badge = page.getByTestId('climate-disclosure-badge');
      await expect(badge).toBeVisible();
      await expect(badge).toContainText(/Modelo SEED H1|heuristic_v1/i);
    });

    test('Atlas Wiki narrative NO cita synthetic como "INEGI" sin disclosure flag', async ({
      page,
    }) => {
      const wiki = page.getByTestId('atlas-wiki-narrative');
      await expect(wiki).toBeVisible();
      const text = await wiki.innerText();
      if (/según INEGI/i.test(text)) {
        await expect(page.getByTestId('atlas-wiki-disclosure-flag')).toBeVisible();
      }
    });

    test('STR card incluye atribución source AirROI cuando datos disponibles', async ({ page }) => {
      const strCard = page.getByTestId('str-source-attribution');
      if ((await strCard.count()) > 0) {
        await expect(strCard).toContainText(/AirROI|fuente:/i);
      }
    });

    test('zone header expone metadata de freshness (last_updated)', async ({ page }) => {
      await expect(page.getByTestId('zone-name-header')).toBeVisible();
      const freshness = page.getByTestId('zone-data-freshness-indicator');
      await expect(freshness).toBeVisible();
      const dt = await freshness.getAttribute('datetime');
      expect(dt).toBeTruthy();
      expect(Number.isNaN(Date.parse(dt as string))).toBe(false);
    });
  });
