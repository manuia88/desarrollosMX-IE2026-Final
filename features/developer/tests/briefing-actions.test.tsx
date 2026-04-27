import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

import { DevQuickActions } from '../components/DevQuickActions';
import { MorningBriefingDev } from '../components/MorningBriefingDev';
import { PendientesList } from '../components/PendientesList';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function render(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('MorningBriefingDev', () => {
  it('renders placeholder banner when briefing.is_placeholder is true', () => {
    const html = render(
      <MorningBriefingDev
        briefing={{
          content: 'Resumen sintético del día.',
          generated_at: '2026-04-27T08:00:00.000Z',
          is_placeholder: true,
          cost_usd: null,
        }}
      />,
    );
    expect(html).toContain('placeholderBanner');
    expect(html).toContain('Resumen sintético del día.');
    expect(html).toContain('title');
  });

  it('renders skeleton when isLoading=true', () => {
    const html = render(<MorningBriefingDev briefing={null} isLoading={true} />);
    expect(html).toContain('data-testid="briefing-skeleton"');
    expect(html).toContain('aria-busy="true"');
  });
});

describe('DevQuickActions', () => {
  it('renders 5 buttons with FASE 15 disclosure (comingSoon) badges', () => {
    const html = render(<DevQuickActions />);
    // 5 disabled buttons referencing each STUB action key
    expect(html).toContain('actions.uploadDoc');
    expect(html).toContain('actions.createLanding');
    expect(html).toContain('actions.emitCfdi');
    expect(html).toContain('actions.sendCommunique');
    expect(html).toContain('actions.startCampaign');
    // 5 disabled buttons => 5 aria-disabled true entries
    const ariaDisabledMatches = html.match(/aria-disabled="true"/g) ?? [];
    expect(ariaDisabledMatches.length).toBeGreaterThanOrEqual(5);
    // disclosure flag visible per ADR-018 §4 señales
    const comingSoonMatches = html.match(/comingSoon/g) ?? [];
    expect(comingSoonMatches.length).toBeGreaterThanOrEqual(5);
  });
});

describe('PendientesList', () => {
  it('renders "empty" copy 3 times when all counts are 0', () => {
    const html = render(
      <PendientesList
        pendientes={{
          documents: { count: 0, latest: [] },
          landings: { count: 0 },
          cfdis: { count: 0 },
        }}
      />,
    );
    const emptyMatches = html.match(/>empty</g) ?? [];
    expect(emptyMatches.length).toBe(3);
    expect(html).toContain('title');
  });
});
