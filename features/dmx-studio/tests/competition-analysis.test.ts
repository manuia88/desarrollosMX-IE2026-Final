// FASE 14.F.4 Sprint 3 — analyzeCompetition tests with injectable client mock.

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PropertyData } from '@/features/dmx-studio/lib/claude-director';
import { analyzeCompetition } from '@/features/dmx-studio/lib/competition-analysis';

const sentryCaptureExceptionMock = vi.fn();
vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: {
    captureException: (...args: unknown[]) => sentryCaptureExceptionMock(...args),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
  },
}));

interface MockClient {
  messages: {
    create: ReturnType<typeof vi.fn>;
  };
}

function makeClient(): MockClient {
  return {
    messages: {
      create: vi.fn(),
    },
  };
}

const validProperty: PropertyData = {
  id: 'prop-1',
  priceUsd: 250_000,
  areaM2: 120,
  bedrooms: 3,
  bathrooms: 2,
  zone: 'Roma Norte',
  city: 'CDMX',
  country: 'MX',
};

afterEach(() => {
  sentryCaptureExceptionMock.mockClear();
  vi.restoreAllMocks();
});

describe('analyzeCompetition — happy path', () => {
  it('returns 3 distinctiveHooks + similarListingsAssumed + costUsd + aiModel', async () => {
    const client = makeClient();
    client.messages.create.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            distinctiveHooks: [
              'Vista panoramica desde piso 18',
              'Penthouse con terraza privada de 40m2',
              'Edificio LEED a 2 cuadras del metro',
            ],
            similarListingsAssumed: 9,
          }),
        },
      ],
      usage: { input_tokens: 250, output_tokens: 120 },
    });

    const result = await analyzeCompetition(validProperty, client as never);

    expect(result.distinctiveHooks).toHaveLength(3);
    expect(result.distinctiveHooks[0]).toContain('Vista');
    expect(result.similarListingsAssumed).toBe(9);
    expect(result.aiModel).toBe('claude-sonnet-4-5');
    expect(result.costUsd).toBeGreaterThan(0);
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });
});

describe('analyzeCompetition — slice(0, 3) hook limit', () => {
  it('limits to 3 hooks even when LLM returns more', async () => {
    const client = makeClient();
    client.messages.create.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            distinctiveHooks: ['hook1', 'hook2', 'hook3', 'hook4', 'hook5'],
            similarListingsAssumed: 7,
          }),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await analyzeCompetition(validProperty, client as never);
    expect(result.distinctiveHooks).toHaveLength(3);
    expect(result.distinctiveHooks).toEqual(['hook1', 'hook2', 'hook3']);
  });
});

describe('analyzeCompetition — cost calculation', () => {
  it('cost matches formula: (input*3 + output*15) / 1M', async () => {
    const client = makeClient();
    const inputTokens = 1000;
    const outputTokens = 200;
    client.messages.create.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            distinctiveHooks: ['a', 'b', 'c'],
            similarListingsAssumed: 8,
          }),
        },
      ],
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    });

    const result = await analyzeCompetition(validProperty, client as never);
    const expected = (1000 * 3 + 200 * 15) / 1_000_000;
    expect(result.costUsd).toBeCloseTo(expected, 8);
  });

  it('cost defaults to 0 when usage missing', async () => {
    const client = makeClient();
    client.messages.create.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            distinctiveHooks: ['a', 'b', 'c'],
            similarListingsAssumed: 8,
          }),
        },
      ],
    });

    const result = await analyzeCompetition(validProperty, client as never);
    expect(result.costUsd).toBe(0);
  });
});

describe('analyzeCompetition — JSON parse error', () => {
  it('captures sentry exception and rethrows when LLM returns invalid JSON', async () => {
    const client = makeClient();
    client.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json {{{' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    await expect(analyzeCompetition(validProperty, client as never)).rejects.toThrow();
    expect(sentryCaptureExceptionMock).toHaveBeenCalledTimes(1);
  });
});

describe('analyzeCompetition — defaults', () => {
  it('similarListingsAssumed defaults to 8 when LLM omits the field', async () => {
    const client = makeClient();
    client.messages.create.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            distinctiveHooks: ['hook A', 'hook B', 'hook C'],
          }),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const result = await analyzeCompetition(validProperty, client as never);
    expect(result.similarListingsAssumed).toBe(8);
  });
});
