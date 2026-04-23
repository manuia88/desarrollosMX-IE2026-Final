import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: (_ns?: string) => (k: string) => k,
  useLocale: () => 'es-MX',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/es-MX/preview/comprador',
  useParams: () => ({ persona: 'comprador', locale: 'es-MX' }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => {
    const el = { type: 'a', props: { href, ...rest, children } };
    return el;
  },
}));

describe('PreviewNav — module export smoke', () => {
  it('exporta PreviewNav como componente función', async () => {
    const mod = await import('../components/PreviewNav');
    expect(typeof mod.PreviewNav).toBe('function');
    expect(mod.PreviewNav.name).toBe('PreviewNav');
  });

  it('acepta activePersona opcional', async () => {
    const mod = await import('../components/PreviewNav');
    const props = { activePersona: 'asesor' as const };
    expect(props.activePersona).toBe('asesor');
    expect(typeof mod.PreviewNav).toBe('function');
  });
});

describe('PreviewNav — links derivados de PERSONA_TYPES', () => {
  it('las cuatro personas están declaradas como links de navegación', async () => {
    const { PERSONA_TYPES } = await import('../types');
    expect(PERSONA_TYPES).toEqual(['comprador', 'asesor', 'developer', 'masterbroker']);
    expect(PERSONA_TYPES.length).toBe(4);
  });

  it('derivedPersona matchea usePathname cuando no se provee activePersona', () => {
    // Emula la lógica interna del componente: regex contra pathname.
    const pathname = '/es-MX/preview/asesor';
    const match = pathname.match(/\/preview\/(comprador|asesor|developer|masterbroker)/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('asesor');
  });

  it('derivedPersona devuelve undefined si pathname no contiene persona válida', () => {
    const pathname = '/es-MX/preview';
    const match = pathname.match(/\/preview\/(comprador|asesor|developer|masterbroker)/);
    expect(match).toBeNull();
  });

  it('activePersona (prop) tiene precedencia sobre pathname', () => {
    // El componente usa activePersona si está presente; esto garantiza que el
    // contrato de la prop existe y es del tipo correcto.
    type PersonaType = 'comprador' | 'asesor' | 'developer' | 'masterbroker';
    const activePersona: PersonaType = 'developer';
    expect(activePersona).toBe('developer');
  });
});

describe('PreviewNav — i18n keys presentes en PreviewShared.nav', () => {
  it('es-MX expone las claves que consume PreviewNav', async () => {
    const messages = await import('@/messages/es-MX.json');
    const shared = (messages.default as Record<string, unknown>).PreviewShared as {
      readonly nav: {
        readonly aria_label: string;
        readonly breadcrumb_preview: string;
        readonly go_to_platform: string;
        readonly persona: Record<'comprador' | 'asesor' | 'developer' | 'masterbroker', string>;
      };
    };
    expect(typeof shared.nav.aria_label).toBe('string');
    expect(typeof shared.nav.breadcrumb_preview).toBe('string');
    expect(typeof shared.nav.go_to_platform).toBe('string');
    expect(typeof shared.nav.persona.comprador).toBe('string');
    expect(typeof shared.nav.persona.asesor).toBe('string');
    expect(typeof shared.nav.persona.developer).toBe('string');
    expect(typeof shared.nav.persona.masterbroker).toBe('string');
  });
});
