import { describe, expect, it } from 'vitest';
import {
  widgetCustomizationSchema,
  widgetEmbedParamsSchema,
  widgetScopeIdSchema,
  widgetVariantSchema,
} from '../schemas/embed';

describe('widgetVariantSchema', () => {
  it('accepts valid variants', () => {
    expect(widgetVariantSchema.safeParse('score').success).toBe(true);
    expect(widgetVariantSchema.safeParse('pulse').success).toBe(true);
    expect(widgetVariantSchema.safeParse('pulse-vs').success).toBe(true);
  });

  it('rejects unknown variants', () => {
    expect(widgetVariantSchema.safeParse('unknown').success).toBe(false);
    expect(widgetVariantSchema.safeParse('').success).toBe(false);
  });
});

describe('widgetScopeIdSchema', () => {
  it('accepts typical slugs', () => {
    expect(widgetScopeIdSchema.safeParse('roma-norte').success).toBe(true);
    expect(widgetScopeIdSchema.safeParse('narvarte').success).toBe(true);
    expect(widgetScopeIdSchema.safeParse('a').success).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(widgetScopeIdSchema.safeParse('').success).toBe(false);
    expect(widgetScopeIdSchema.safeParse('roma norte').success).toBe(false);
    expect(widgetScopeIdSchema.safeParse('-bad-start').success).toBe(false);
    expect(widgetScopeIdSchema.safeParse(`toolong${'x'.repeat(200)}`).success).toBe(false);
    expect(widgetScopeIdSchema.safeParse('bad/slash').success).toBe(false);
  });
});

describe('widgetCustomizationSchema', () => {
  it('accepts valid customization', () => {
    const res = widgetCustomizationSchema.safeParse({
      theme: 'dark',
      locale: 'es-MX',
      ctaUrl: 'https://desarrollosmx.com/foo',
    });
    expect(res.success).toBe(true);
  });

  it('accepts empty object', () => {
    expect(widgetCustomizationSchema.safeParse({}).success).toBe(true);
  });

  it('rejects unknown theme value', () => {
    expect(widgetCustomizationSchema.safeParse({ theme: 'neon' }).success).toBe(false);
  });

  it('rejects non-url ctaUrl', () => {
    expect(widgetCustomizationSchema.safeParse({ ctaUrl: 'not-a-url' }).success).toBe(false);
  });

  it('rejects extra keys (strict mode)', () => {
    expect(widgetCustomizationSchema.safeParse({ theme: 'dark', extra: 1 }).success).toBe(false);
  });
});

describe('widgetEmbedParamsSchema', () => {
  it('accepts full valid params', () => {
    const res = widgetEmbedParamsSchema.safeParse({
      variant: 'pulse-vs',
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      compareScopeId: 'narvarte',
      customization: { theme: 'light', locale: 'pt-BR' },
    });
    expect(res.success).toBe(true);
  });

  it('accepts minimal valid params', () => {
    const res = widgetEmbedParamsSchema.safeParse({
      variant: 'score',
      scopeType: 'colonia',
      scopeId: 'roma-norte',
    });
    expect(res.success).toBe(true);
  });

  it('rejects invalid scopeType', () => {
    const res = widgetEmbedParamsSchema.safeParse({
      variant: 'score',
      scopeType: 'planet',
      scopeId: 'roma-norte',
    });
    expect(res.success).toBe(false);
  });

  it('rejects invalid compareScopeId', () => {
    const res = widgetEmbedParamsSchema.safeParse({
      variant: 'pulse-vs',
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      compareScopeId: '',
    });
    expect(res.success).toBe(false);
  });
});
