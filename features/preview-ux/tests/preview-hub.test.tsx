import { describe, expect, it } from 'vitest';
import { isPersonaType, PERSONA_TYPES, type PersonaType } from '../types';

describe('PreviewHub — PERSONA_TYPES enum', () => {
  it('tiene exactamente 4 personas en orden canónico', () => {
    expect(PERSONA_TYPES.length).toBe(4);
    expect(PERSONA_TYPES[0]).toBe('comprador');
    expect(PERSONA_TYPES[1]).toBe('asesor');
    expect(PERSONA_TYPES[2]).toBe('developer');
    expect(PERSONA_TYPES[3]).toBe('masterbroker');
  });

  it('es un tuple readonly (inmutable)', () => {
    // TypeScript check: forma `readonly ['comprador','asesor','developer','masterbroker']`.
    const first: PersonaType = PERSONA_TYPES[0];
    expect(first).toBe('comprador');
  });
});

describe('PreviewHub — isPersonaType type guard', () => {
  it('valida personas reconocidas', () => {
    expect(isPersonaType('comprador')).toBe(true);
    expect(isPersonaType('asesor')).toBe(true);
    expect(isPersonaType('developer')).toBe(true);
    expect(isPersonaType('masterbroker')).toBe(true);
  });

  it('rechaza strings que no son personas válidas', () => {
    expect(isPersonaType('admin')).toBe(false);
    expect(isPersonaType('')).toBe(false);
    expect(isPersonaType('COMPRADOR')).toBe(false);
    expect(isPersonaType('master_broker')).toBe(false);
    expect(isPersonaType('asesores')).toBe(false);
  });

  it('narrow funciona correctamente (type inference)', () => {
    const raw: string = 'comprador';
    if (isPersonaType(raw)) {
      const typed: PersonaType = raw;
      expect(typed).toBe('comprador');
    } else {
      throw new Error('expected guard to pass');
    }
  });
});

describe('PreviewHub — i18n keys del hub', () => {
  it('es-MX declara PreviewHub con claves esperadas por la página', async () => {
    const messages = await import('@/messages/es-MX.json');
    const hub = (messages.default as Record<string, unknown>).PreviewHub as {
      readonly meta_title: string;
      readonly meta_description: string;
      readonly eyebrow: string;
      readonly title: string;
      readonly subtitle: string;
      readonly cta_open_preview: string;
      readonly personas: Record<
        'comprador' | 'asesor' | 'developer' | 'masterbroker',
        { readonly title: string; readonly description: string }
      >;
    };
    expect(typeof hub.meta_title).toBe('string');
    expect(typeof hub.meta_description).toBe('string');
    expect(typeof hub.title).toBe('string');
    expect(typeof hub.subtitle).toBe('string');
    expect(typeof hub.cta_open_preview).toBe('string');
    for (const persona of PERSONA_TYPES) {
      expect(typeof hub.personas[persona].title).toBe('string');
      expect(typeof hub.personas[persona].description).toBe('string');
    }
  });
});
