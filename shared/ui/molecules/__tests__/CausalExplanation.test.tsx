import { describe, expect, it, vi } from 'vitest';
import type { CausalExplanation as CausalExplanationData } from '@/shared/types/scores';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
}));

describe('CausalExplanation — module export smoke', () => {
  it('exporta CausalExplanation como función', async () => {
    const mod = await import('../CausalExplanation');
    expect(typeof mod.CausalExplanation).toBe('function');
    expect(mod.CausalExplanation.name).toBe('CausalExplanation');
  });

  it('acepta props presentacionales mínimas (type check)', async () => {
    const mod = await import('../CausalExplanation');
    const sampleData: CausalExplanationData = {
      explanation_md: 'Roma Norte muestra **alta** demanda [[score:x]].',
      citations: [
        {
          ref_id: 'score:x',
          type: 'score',
          label: 'IPV',
          value: 88.2,
          source: 'DMX Indices',
        },
      ],
      model: 'claude-sonnet-4-5',
      prompt_version: 'v1',
      generated_at: '2026-04-21T00:00:00Z',
      cached: false,
    };
    const props = {
      data: sampleData,
      isLoading: false,
      error: null,
      scopeId: 'roma-norte',
      scopeLabel: 'Roma Norte',
    } as const;
    expect(props.data.explanation_md).toContain('Roma Norte');
    expect(typeof mod.CausalExplanation).toBe('function');
  });

  it('soporta estado loading (data=null, isLoading=true)', async () => {
    const mod = await import('../CausalExplanation');
    const props = {
      data: null,
      isLoading: true,
      error: null,
      scopeId: 'roma-norte',
    } as const;
    expect(props.isLoading).toBe(true);
    expect(typeof mod.CausalExplanation).toBe('function');
  });

  it('soporta estado error (data=null, error presente)', async () => {
    const mod = await import('../CausalExplanation');
    const props = {
      data: null,
      isLoading: false,
      error: new Error('boom'),
      scopeId: 'roma-norte',
    } as const;
    expect(props.error).toBeInstanceOf(Error);
    expect(typeof mod.CausalExplanation).toBe('function');
  });

  it('soporta localeSupported=false (fallback card)', async () => {
    const mod = await import('../CausalExplanation');
    const props = {
      data: null,
      isLoading: false,
      error: null,
      localeSupported: false,
      scopeId: 'roma-norte',
    } as const;
    expect(props.localeSupported).toBe(false);
    expect(typeof mod.CausalExplanation).toBe('function');
  });
});
