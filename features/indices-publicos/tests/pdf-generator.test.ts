import { describe, expect, it } from 'vitest';
import type { MethodologyRow } from '../lib/methodology-helpers';
import { renderMethodologyPDF } from '../lib/pdf-generator';

const STRINGS = {
  coverTitle: 'Metodología — IPV',
  coverSubtitle: 'Versión activa',
  versionLabel: 'Versión {version}',
  effectiveFrom: 'Vigente desde {date}',
  effectiveTo: 'Vigente hasta {date}',
  weightsTitle: 'Pesos',
  formulaTitle: 'Fórmula',
  changelogTitle: 'Changelog',
  generatedAt: 'Generado el 2026-04-21',
  footerDisclaimer: 'Documento oficial DMX',
} as const;

const row: MethodologyRow = {
  index_code: 'IPV',
  version: '1.0.0',
  formula_md: 'score = 0.4 * plusvalia_5y + 0.3 * amenidades + 0.3 * seguridad',
  weights_jsonb: { plusvalia_5y: 0.4, amenidades: 0.3, seguridad: 0.3 },
  effective_from: '2026-01-01',
  effective_to: null,
  changelog_notes: 'Initial version',
  approved_at: '2026-01-01',
};

describe('renderMethodologyPDF smoke', () => {
  it('genera PDF buffer no vacío para versión activa', async () => {
    const buf = await renderMethodologyPDF({
      indexCode: 'IPV',
      versions: [row],
      strings: STRINGS,
      today: '2026-04-21',
    });
    expect(buf).not.toBeNull();
    expect(buf?.length).toBeGreaterThan(500);
    // PDF magic number "%PDF"
    expect(buf?.slice(0, 4).toString()).toBe('%PDF');
  });

  it('devuelve null cuando no hay versions', async () => {
    const buf = await renderMethodologyPDF({
      indexCode: 'IPV',
      versions: [],
      strings: STRINGS,
      today: '2026-04-21',
    });
    expect(buf).toBeNull();
  });
});
