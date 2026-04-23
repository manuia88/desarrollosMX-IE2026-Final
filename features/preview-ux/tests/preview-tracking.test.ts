import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type PosthogLike = { capture?: (e: string, p: unknown) => void };
type WindowLike = { posthog?: PosthogLike };

function setWindow(w: WindowLike | undefined): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (w === undefined) {
    delete g.window;
  } else {
    g.window = w;
  }
}

function getCaptureSpy(): ReturnType<typeof vi.fn> {
  return vi.fn();
}

describe('preview-tracking — trackPreviewViewed', () => {
  beforeEach(() => {
    setWindow(undefined);
  });

  afterEach(() => {
    setWindow(undefined);
  });

  it('captura el evento preview.viewed con persona y locale', async () => {
    const spy = getCaptureSpy();
    setWindow({ posthog: { capture: spy as unknown as (e: string, p: unknown) => void } });

    const { trackPreviewViewed } = await import('../lib/preview-tracking');
    trackPreviewViewed('comprador', 'es-MX');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('preview.viewed', {
      persona: 'comprador',
      locale: 'es-MX',
    });
  });

  it('no-op silencioso cuando posthog no existe en window', async () => {
    setWindow({});
    const { trackPreviewViewed } = await import('../lib/preview-tracking');
    expect(() => trackPreviewViewed('asesor', 'es-CO')).not.toThrow();
  });

  it('no-op silencioso cuando posthog.capture no existe', async () => {
    setWindow({ posthog: {} });
    const { trackPreviewViewed } = await import('../lib/preview-tracking');
    expect(() => trackPreviewViewed('developer', 'pt-BR')).not.toThrow();
  });

  it('no rompe si posthog.capture lanza (analytics no rompe UI)', async () => {
    const spy = vi.fn(() => {
      throw new Error('network down');
    });
    setWindow({ posthog: { capture: spy as unknown as (e: string, p: unknown) => void } });

    const { trackPreviewViewed } = await import('../lib/preview-tracking');
    expect(() => trackPreviewViewed('masterbroker', 'en-US')).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});

describe('preview-tracking — trackPreviewCtaClicked', () => {
  beforeEach(() => {
    setWindow(undefined);
  });

  afterEach(() => {
    setWindow(undefined);
  });

  it('captura el evento preview.cta_clicked con persona, ctaId y locale', async () => {
    const spy = getCaptureSpy();
    setWindow({ posthog: { capture: spy as unknown as (e: string, p: unknown) => void } });

    const { trackPreviewCtaClicked } = await import('../lib/preview-tracking');
    trackPreviewCtaClicked('developer', 'preview_developer_signup', 'es-AR');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('preview.cta_clicked', {
      persona: 'developer',
      ctaId: 'preview_developer_signup',
      locale: 'es-AR',
    });
  });

  it('no-op silencioso cuando posthog no está disponible', async () => {
    setWindow({});
    const { trackPreviewCtaClicked } = await import('../lib/preview-tracking');
    expect(() => trackPreviewCtaClicked('comprador', 'x', 'es-MX')).not.toThrow();
  });
});
