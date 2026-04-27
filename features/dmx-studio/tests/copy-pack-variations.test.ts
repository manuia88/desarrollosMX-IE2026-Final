// FASE 14.F.4 Sprint 3 UPGRADE 3 — Variations lib pure tests.
// Modo A: inyectable DirectorClientLike. Cubre 3 tonos returned, cost calc,
// missing-tone defaulting a string vacío.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

import { generateThreeVariations } from '@/features/dmx-studio/lib/director/copy-pack/variations';

interface ClientResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface DirectorClientLike {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
    }) => Promise<ClientResponse>;
  };
}

function makeMockClient(response: ClientResponse): DirectorClientLike {
  return {
    messages: {
      create: vi.fn(async () => response),
    },
  };
}

const allTonesJson = JSON.stringify({
  formal: 'Atentamente le presento esta exclusiva propiedad en Polanco.',
  cercano: 'Mira, te tengo este súper depa en Polanco que te va a encantar.',
  aspiracional: 'Imagina despertar cada mañana con vista a Polanco.',
});

describe('generateThreeVariations — happy path', () => {
  it('returns formal/cercano/aspiracional + cost + aiModel', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: allTonesJson }],
      usage: { input_tokens: 500, output_tokens: 1500 },
    });

    const result = await generateThreeVariations(
      'Texto original sobre Polanco.',
      'instagram_caption',
      client,
    );

    expect(result.formal).toContain('Atentamente');
    expect(result.cercano).toContain('súper');
    expect(result.aspiracional).toContain('Imagina');
    expect(result.aiModel).toBe('claude-sonnet-4-5');
  });

  it('cost estimation = (input*3 + output*15) / 1_000_000', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: allTonesJson }],
      usage: { input_tokens: 500, output_tokens: 1500 },
    });

    const result = await generateThreeVariations('Texto original.', 'wa_message', client);

    // cost = (500*3 + 1500*15) / 1M = (1500 + 22500) / 1M = 0.024
    expect(result.costUsd).toBeCloseTo(0.024, 5);
  });
});

describe('generateThreeVariations — missing tones default to empty string', () => {
  it('formal missing → empty string, others preserved', async () => {
    const client = makeMockClient({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            cercano: 'Solo cercano',
            aspiracional: 'Solo aspiracional',
          }),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await generateThreeVariations('Original', 'video_title', client);

    expect(result.formal).toBe('');
    expect(result.cercano).toBe('Solo cercano');
    expect(result.aspiracional).toBe('Solo aspiracional');
  });

  it('all tones missing → all three empty strings', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: JSON.stringify({}) }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    const result = await generateThreeVariations('Original', 'portal_listing', client);

    expect(result.formal).toBe('');
    expect(result.cercano).toBe('');
    expect(result.aspiracional).toBe('');
  });
});

describe('generateThreeVariations — error path', () => {
  it('throws when JSON content is malformed', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: 'not json {' }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    await expect(
      generateThreeVariations('Original', 'instagram_caption', client),
    ).rejects.toThrow();
  });
});
