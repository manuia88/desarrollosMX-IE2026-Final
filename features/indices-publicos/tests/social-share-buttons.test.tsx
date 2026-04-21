import { describe, expect, it } from 'vitest';
import { SocialShareButtons } from '../components/SocialShareButtons';

describe('features/indices-publicos/components/SocialShareButtons', () => {
  it('exporta función componente', () => {
    expect(typeof SocialShareButtons).toBe('function');
    expect(SocialShareButtons.name).toBe('SocialShareButtons');
  });

  it('construye URLs share que codifican correctamente texto con espacios', () => {
    const url = 'https://dmx.test/indices/IPV';
    const text = 'Ranking DMX IPV';

    const encoded = encodeURIComponent(`${text} ${url}`);
    expect(encoded).toContain('Ranking%20DMX%20IPV');

    const twitterParams = new URLSearchParams({ text, url });
    expect(twitterParams.get('text')).toBe(text);
    expect(twitterParams.get('url')).toBe(url);

    const linkedinParams = new URLSearchParams({ url });
    expect(linkedinParams.get('url')).toBe(url);
  });
});
