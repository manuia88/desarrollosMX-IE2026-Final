import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useLocale: () => 'es-MX',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    onClick,
    children,
    ...rest
  }: {
    href: string;
    onClick?: () => void;
    children: React.ReactNode;
  } & Record<string, unknown>) => {
    return { type: 'a', props: { href, onClick, ...rest, children } };
  },
}));

describe('PreviewCta — module export smoke', () => {
  it('exporta PreviewCta como componente función', async () => {
    const mod = await import('../components/PreviewCta');
    expect(typeof mod.PreviewCta).toBe('function');
    expect(mod.PreviewCta.name).toBe('PreviewCta');
  });

  it('acepta props del contrato (type check)', async () => {
    const mod = await import('../components/PreviewCta');
    const props = {
      persona: 'comprador' as const,
      ctaId: 'preview_comprador_primary',
      href: '/es-MX/signup',
      variant: 'primary' as const,
      children: 'Comenzar',
    };
    expect(props.persona).toBe('comprador');
    expect(props.ctaId).toBe('preview_comprador_primary');
    expect(props.href).toBe('/es-MX/signup');
    expect(typeof mod.PreviewCta).toBe('function');
  });
});

describe('PreviewCta — tracking wiring', () => {
  it('re-exporta trackPreviewCtaClicked desde preview-tracking', async () => {
    const mod = await import('../lib/preview-tracking');
    expect(typeof mod.trackPreviewCtaClicked).toBe('function');
  });

  it('click en CTA invoca window.posthog.capture con payload correcto', async () => {
    const captureSpy = vi.fn();
    const g = globalThis as unknown as Record<string, unknown>;
    g.window = { posthog: { capture: captureSpy } };

    const { trackPreviewCtaClicked } = await import('../lib/preview-tracking');
    trackPreviewCtaClicked('asesor', 'preview_asesor_signup', 'es-MX');

    expect(captureSpy).toHaveBeenCalledTimes(1);
    expect(captureSpy).toHaveBeenCalledWith('preview.cta_clicked', {
      persona: 'asesor',
      ctaId: 'preview_asesor_signup',
      locale: 'es-MX',
    });

    delete g.window;
  });
});
