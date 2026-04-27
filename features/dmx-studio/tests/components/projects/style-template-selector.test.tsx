// FASE 14.F.2 Sprint 1 — StyleTemplateSelector smoke + 5-template render contract.

import { describe, expect, it, vi } from 'vitest';
import { STUDIO_STYLE_TEMPLATE_KEYS } from '@/features/dmx-studio/schemas';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

describe('StyleTemplateSelector — module export smoke', () => {
  it('exports StyleTemplateSelector and 5 canon style keys', async () => {
    const mod = await import('../../../components/projects/StyleTemplateSelector');
    expect(typeof mod.StyleTemplateSelector).toBe('function');
    expect(mod.STYLE_TEMPLATE_KEYS_LIST.length).toBe(5);
    expect(mod.STYLE_TEMPLATE_KEYS_LIST).toEqual([
      'modern_cinematic',
      'luxe_editorial',
      'family_friendly',
      'investor_pitch',
      'minimal_clean',
    ]);
  });
});

describe('StyleTemplateSelector — Zod canon keys aligned with schemas', () => {
  it('schemas STUDIO_STYLE_TEMPLATE_KEYS match the 5 cards rendered', () => {
    expect(STUDIO_STYLE_TEMPLATE_KEYS).toEqual([
      'modern_cinematic',
      'luxe_editorial',
      'family_friendly',
      'investor_pitch',
      'minimal_clean',
    ]);
  });

  it('every key has dedicated i18n contract (name + description)', async () => {
    const messages = await import('@/messages/es-MX.json');
    type StyleI18n = { name: string; description: string };
    const styles = (
      messages.default as unknown as {
        Studio: { projects: { new: { style: Record<string, StyleI18n> } } };
      }
    ).Studio.projects.new.style;

    for (const i18nKey of [
      'modernCinematic',
      'luxeEditorial',
      'familyFriendly',
      'investorPitch',
      'minimalClean',
    ]) {
      const entry = styles[i18nKey];
      expect(entry).toBeDefined();
      expect(entry?.name.length).toBeGreaterThan(2);
      expect(entry?.description.length).toBeGreaterThan(5);
    }
  });
});
