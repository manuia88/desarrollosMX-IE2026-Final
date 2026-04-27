// FASE 14.F.4 Sprint 3 — Copy Pack lib pure tests.
// Modo A: zero red dependencies. Inyectable DirectorClientLike (no @anthropic-ai/sdk).
// Cubre: 5 outputs returned, cost calc, WhatsApp deep-link builder edge cases,
// JSON parsing edge cases (malformed throws).

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

import type { PropertyData } from '@/features/dmx-studio/lib/claude-director';
import { generateCompleteCopyPack } from '@/features/dmx-studio/lib/director/copy-pack';

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

const sampleProperty: PropertyData = {
  id: 'sample-1',
  priceUsd: 250000,
  areaM2: 120,
  bedrooms: 3,
  bathrooms: 2,
  zone: 'Polanco',
  city: 'CDMX',
  country: 'MX',
};

const sampleJsonContent = JSON.stringify({
  captionInstagram: 'Caption ig texto',
  hashtags: ['#cdmx', '#polanco', '#hogar'],
  messageWhatsapp: 'Hola, te comparto este listing premium en Polanco.',
  descriptionPortal: 'Descripción larga SEO para portal con detalles de zona y amenidades.',
  narrationScript: 'Guion de voz natural conversacional sobre el inmueble.',
  videoTitle: 'Polanco · 120 m² · 3 rec',
});

describe('generateCompleteCopyPack — happy path', () => {
  it('returns 5 outputs + cost + aiModel when JSON valid + phone provided', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: sampleJsonContent }],
      usage: { input_tokens: 1000, output_tokens: 800 },
    });

    const pack = await generateCompleteCopyPack(
      sampleProperty,
      { displayName: 'Manu', contactPhone: '+52 55 1234 5678', tone: 'professional' },
      client,
    );

    expect(pack.captionInstagram).toBe('Caption ig texto');
    expect(pack.hashtags).toHaveLength(3);
    expect(pack.messageWhatsapp).toContain('Polanco');
    expect(pack.descriptionPortal.length).toBeGreaterThan(10);
    expect(pack.narrationScript.length).toBeGreaterThan(10);
    expect(pack.videoTitle).toBe('Polanco · 120 m² · 3 rec');
    expect(pack.aiModel).toBe('claude-sonnet-4-5');
    // cost = (1000*3 + 800*15) / 1_000_000 = (3000 + 12000) / 1M = 0.015
    expect(pack.costUsd).toBeCloseTo(0.015, 5);
  });

  it('builds whatsappDeepLink wa.me/<digits>?text=<encoded> when phone valid', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: sampleJsonContent }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    const pack = await generateCompleteCopyPack(
      sampleProperty,
      { displayName: 'Manu', contactPhone: '+52 55 1234 5678', tone: 'professional' },
      client,
    );

    expect(pack.whatsappDeepLink).not.toBeNull();
    expect(pack.whatsappDeepLink).toContain('https://wa.me/525512345678');
    // Encoded text should not contain raw spaces
    expect(pack.whatsappDeepLink).toContain('?text=');
    expect(pack.whatsappDeepLink).not.toContain('Hola, te');
  });

  it('whatsappDeepLink null when phone is null', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: sampleJsonContent }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    const pack = await generateCompleteCopyPack(
      sampleProperty,
      { displayName: 'Manu', contactPhone: null, tone: 'professional' },
      client,
    );

    expect(pack.whatsappDeepLink).toBeNull();
  });

  it('whatsappDeepLink null when phone has fewer than 7 digits', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: sampleJsonContent }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    const pack = await generateCompleteCopyPack(
      sampleProperty,
      { displayName: 'Manu', contactPhone: '+52-55', tone: 'professional' },
      client,
    );

    expect(pack.whatsappDeepLink).toBeNull();
  });
});

describe('generateCompleteCopyPack — JSON parsing edge cases', () => {
  it('throws when content is malformed JSON', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: '{not valid json' }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    await expect(
      generateCompleteCopyPack(
        sampleProperty,
        { displayName: 'Manu', contactPhone: null, tone: 'professional' },
        client,
      ),
    ).rejects.toThrow();
  });

  it('defaults missing fields to empty string / empty array when JSON has gaps', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: JSON.stringify({ captionInstagram: 'only this' }) }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    const pack = await generateCompleteCopyPack(
      sampleProperty,
      { displayName: 'Manu', contactPhone: null, tone: 'professional' },
      client,
    );

    expect(pack.captionInstagram).toBe('only this');
    expect(pack.hashtags).toEqual([]);
    expect(pack.messageWhatsapp).toBe('');
    expect(pack.descriptionPortal).toBe('');
    expect(pack.narrationScript).toBe('');
    expect(pack.videoTitle).toBe('');
  });
});

describe('generateCompleteCopyPack — cost estimation', () => {
  it('costUsd = 0 when usage block is absent', async () => {
    const client = makeMockClient({
      content: [{ type: 'text', text: sampleJsonContent }],
      // usage missing
    });

    const pack = await generateCompleteCopyPack(
      sampleProperty,
      { displayName: 'Manu', contactPhone: null, tone: 'professional' },
      client,
    );

    expect(pack.costUsd).toBe(0);
  });
});
