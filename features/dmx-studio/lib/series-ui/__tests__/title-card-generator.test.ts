import { describe, expect, it } from 'vitest';
import { renderTitleCardSvg } from '../title-card-generator';

describe('renderTitleCardSvg F14.F.9 Upgrade 3', () => {
  it('genera SVG válido con title + counter', () => {
    const svg = renderTitleCardSvg({
      seriesTitle: 'Torre Reforma',
      episodeTitle: 'El Sueño',
      counterLabel: 'Capítulo 1 de 5',
      primaryColor: '#6366F1',
      secondaryColor: '#EC4899',
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('Torre Reforma');
    expect(svg).toContain('El Sueño');
    expect(svg).toContain('Capítulo 1 de 5');
    expect(svg).toContain('#6366F1');
    expect(svg).toContain('#EC4899');
  });

  it('escapa caracteres XML peligrosos', () => {
    const svg = renderTitleCardSvg({
      seriesTitle: 'Test <script>alert(1)</script>',
      episodeTitle: 'Quote "test"',
      counterLabel: 'Cap 1',
      primaryColor: '#000',
      secondaryColor: '#FFF',
    });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&quot;test&quot;');
  });

  it('respeta canon ADR-050: gradient brand + Outfit fonts', () => {
    const svg = renderTitleCardSvg({
      seriesTitle: 'Series A',
      episodeTitle: 'Ep B',
      counterLabel: 'Cap C',
      primaryColor: '#6366F1',
      secondaryColor: '#EC4899',
    });
    expect(svg).toContain('linearGradient');
    expect(svg).toContain('Outfit');
  });
});
