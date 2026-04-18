import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('A11y — Design System preview', () => {
  test('no critical/serious axe violations on /design-system', async ({ page }) => {
    await page.goto('/design-system');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    if (blocking.length > 0) {
      console.error('Axe violations:', JSON.stringify(blocking, null, 2));
    }
    expect(blocking).toEqual([]);
  });

  test('reduced-motion disables Card3D tilt effect', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/design-system');
    await page.waitForLoadState('networkidle');

    const card = page.locator('text=Con tilt').first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    if (!box) throw new Error('Card not visible');
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2);
    await page.waitForTimeout(300);
    const transform = await card.evaluate((el) => {
      const host = el.closest('[style*="transform"]') as HTMLElement | null;
      return host?.style.transform ?? '';
    });
    expect(transform).toBe('');
    await context.close();
  });
});
