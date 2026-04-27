import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

import { DevCompanyHeader } from '../components/DevCompanyHeader';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderHtml(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('DevCompanyHeader', () => {
  it('renders Trust Score, score number, and verified pill when isVerified=true', () => {
    const html = renderHtml(
      <DevCompanyHeader
        company={{
          name: 'Acme Desarrollos',
          legalName: 'Acme Desarrollos S.A. de C.V.',
          taxId: 'ACM010101ABC',
          logoUrl: null,
          yearsOperating: 12,
          isVerified: true,
        }}
        trustScore={{ score: 87, level: 'gold' }}
      />,
    );
    expect(html).toContain('trustScoreLabel');
    expect(html).toContain('87');
    expect(html).toContain('verified');
    expect(html).toContain('data-testid="company-verified-pill"');
  });
});
