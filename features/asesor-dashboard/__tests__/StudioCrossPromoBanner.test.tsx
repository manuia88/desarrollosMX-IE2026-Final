// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Tests StudioCrossPromoBanner: render condicional + CTA href.

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    'aria-label': ariaLabel,
    'data-testid': testId,
    style,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    'aria-label'?: string;
    'data-testid'?: string;
    style?: React.CSSProperties;
    className?: string;
  }) => {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        data-testid={testId}
        style={style}
        className={className}
      >
        {children}
      </a>
    );
  },
}));

import { StudioCrossPromoBanner } from '@/features/asesor-dashboard/components/StudioCrossPromoBanner';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderHtml(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('StudioCrossPromoBanner', () => {
  it('returns null when all activity signals are below threshold', () => {
    const html = renderHtml(
      <StudioCrossPromoBanner
        contactosCount={0}
        operacionesCerradasCount={0}
        desarrollosActivosCount={0}
        locale="es-MX"
      />,
    );
    expect(html).toBe('');
  });

  it('renders banner with CTA href to /{locale}/studio when operacionesCerradasCount > 0', () => {
    const html = renderHtml(
      <StudioCrossPromoBanner
        contactosCount={0}
        operacionesCerradasCount={1}
        desarrollosActivosCount={0}
        locale="es-MX"
      />,
    );
    expect(html).toContain('data-testid="studio-cross-promo-banner"');
    expect(html).toContain('data-testid="studio-cross-promo-cta"');
    expect(html).toContain('href="/es-MX/studio"');
    expect(html).toContain('<section');
    expect(html).toContain('aria-label=');
  });
});
