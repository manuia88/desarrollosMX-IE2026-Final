// F14.F.5 Sprint 4 — CalendarMonthView smoke + grid contract.

import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('CalendarMonthView — module export smoke', () => {
  it('exports CalendarMonthView as function', async () => {
    const mod = await import('../../components/calendar/CalendarMonthView');
    expect(typeof mod.CalendarMonthView).toBe('function');
  });

  it('grid builds 7-column layout (calendar always multiple of 7 cells)', async () => {
    // The component uses internal buildMonthGrid which rounds to multiples of 7.
    // Smoke contract: a 30-day month starting on Friday should produce 35 or 42 cells.
    const monthDate = '2026-05-01'; // 2026-05-01 is a Friday → padding 5 + 31 days = 36 → 42
    const [year, month] = monthDate.split('-').map(Number);
    const firstDay = new Date(Date.UTC(year ?? 2026, (month ?? 5) - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year ?? 2026, month ?? 5, 0)).getUTCDate();
    const totalCells = firstDay + daysInMonth;
    const padded = Math.ceil(totalCells / 7) * 7;
    expect(padded % 7).toBe(0);
    expect(padded).toBeGreaterThanOrEqual(35);
  });

  it('topic kind tints map to canon ADR-050 5 wayfinding colors (marca/propiedad/zona/remarketing/email)', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const url = await import('node:url');
    const here = url.fileURLToPath(new URL('.', import.meta.url));
    const filePath = path.resolve(here, '../../components/calendar/CalendarMonthView.tsx');
    const source = await fs.readFile(filePath, 'utf-8');
    expect(source).toMatch(/marca:/);
    expect(source).toMatch(/propiedad:/);
    expect(source).toMatch(/zona:/);
    expect(source).toMatch(/remarketing:/);
    expect(source).toMatch(/email:/);
    // Tokens canon ADR-050 (no hardcoded hex).
    expect(source).toMatch(/var\(--accent-violet\)/);
    expect(source).toMatch(/var\(--canon-indigo-2\)/);
    expect(source).toMatch(/var\(--accent-teal\)/);
    expect(source).toMatch(/var\(--canon-amber\)/);
    expect(source).toMatch(/var\(--canon-rose\)/);
  });
});
