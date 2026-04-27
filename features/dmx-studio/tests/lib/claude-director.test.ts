// DMX Studio dentro DMX único entorno (ADR-054).
// Tests director creativo: connection probe + analyze + hook variants + Zod input validation.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AnalyzePhotosInput,
  analyzePhotos,
  generateHookVariants,
  type PropertyData,
  testConnection,
} from '../../lib/claude-director';

const ORIG_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
});

afterEach(() => {
  if (ORIG_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG_KEY;
  vi.restoreAllMocks();
});

interface MockClient {
  messages: {
    create: ReturnType<typeof vi.fn>;
    countTokens: ReturnType<typeof vi.fn>;
  };
}

function makeClient(overrides: Partial<MockClient['messages']> = {}): MockClient {
  return {
    messages: {
      create: vi.fn(),
      countTokens: vi.fn(),
      ...overrides,
    },
  } satisfies MockClient;
}

const validProperty: PropertyData = {
  id: 'prop-001',
  priceUsd: 250000,
  areaM2: 120,
  bedrooms: 3,
  bathrooms: 2,
  zone: 'Roma Norte',
  city: 'Ciudad de Mexico',
  country: 'MX',
};

const validDirectorOutput = {
  narrativeOrder: ['photo-1', 'photo-2', 'photo-3'],
  klingPrompts: [
    {
      sceneIndex: 0,
      prompt: 'camera dolly forward into living room',
      cameraMovement: 'zoom_in',
      durationSeconds: 5,
    },
  ],
  moodMusic: {
    genre: 'ambient-uplifting',
    tempo: 'medium',
    prompt: 'warm cinematic instrumental, subtle strings',
  },
  hooks: [
    'Descubre tu nuevo hogar en Roma Norte hoy mismo amigo',
    '120 metros cuadrados pensados para tu familia',
    'Vive donde otros suenan vivir cada manana',
  ],
  copyPack: {
    captionInstagram: 'Departamento en Roma Norte de 120m2 con 3 recamaras y 2 banos',
    hashtags: [
      '#romanorte',
      '#cdmx',
      '#departamento',
      '#inmuebles',
      '#realestate',
      '#mexico',
      '#hogar',
      '#inversion',
    ],
    messageWhatsapp: 'Te comparto este departamento en Roma Norte de 120m2',
    descriptionPortal: 'Excelente departamento en zona Roma Norte 120m2 3 recamaras 2 banos',
  },
  narrationScript:
    'Imagina despertar cada manana en el corazon de Roma Norte con luz natural inundando tus 120 metros cuadrados de espacio cuidadosamente disenado para tu familia con tres recamaras dos banos completos y un estilo de vida que pocos pueden permitirse pero tu si esta a tu alcance.',
};

describe('claude-director testConnection', () => {
  it('returns ok:true accountActive:true on countTokens success', async () => {
    const client = makeClient();
    client.messages.countTokens.mockResolvedValue({ input_tokens: 5 });
    const result = await testConnection({ client: client as never });
    expect(result.ok).toBe(true);
    expect(result.accountActive).toBe(true);
    expect(result.error).toBeUndefined();
    expect(client.messages.countTokens).toHaveBeenCalledTimes(1);
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  it('returns ok:false with error when countTokens throws', async () => {
    const client = makeClient();
    client.messages.countTokens.mockRejectedValue(new Error('401 invalid api key'));
    const result = await testConnection({ client: client as never });
    expect(result.ok).toBe(false);
    expect(result.accountActive).toBe(false);
    expect(result.error).toContain('401');
  });
});

describe('claude-director analyzePhotos', () => {
  it('throws on Zod input validation when photos array is empty', async () => {
    const client = makeClient();
    const badInput = {
      photos: [],
      propertyData: validProperty,
    } as unknown as AnalyzePhotosInput;
    await expect(analyzePhotos(badInput, { client: client as never })).rejects.toThrow();
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  it('returns parsed DirectorOutput from valid model JSON response', async () => {
    const client = makeClient();
    client.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validDirectorOutput) }],
    });
    const input: AnalyzePhotosInput = {
      photos: [
        { id: 'photo-1', url: 'https://cdn.example.com/p1.jpg', category: 'sala' },
        { id: 'photo-2', url: 'https://cdn.example.com/p2.jpg', category: 'cocina' },
        { id: 'photo-3', url: 'https://cdn.example.com/p3.jpg', category: 'recamara' },
      ],
      propertyData: validProperty,
    };
    const result = await analyzePhotos(input, { client: client as never });
    expect(result.narrativeOrder).toHaveLength(3);
    expect(result.hooks).toHaveLength(3);
    expect(result.copyPack.hashtags.length).toBeGreaterThanOrEqual(8);
    expect(result.klingPrompts[0]?.cameraMovement).toBe('zoom_in');
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });
});

describe('claude-director generateHookVariants', () => {
  it('returns array of strings parsed from model response', async () => {
    const client = makeClient();
    const hooks = [
      'Hogar en Roma Norte que cambia tu vida diaria',
      'Tres recamaras dos banos 120 metros cuadrados perfectos',
      'Inversion inteligente en zona premium de la ciudad capital',
    ];
    client.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ hooks }) }],
    });
    const result = await generateHookVariants(validProperty, 3, { client: client as never });
    expect(result).toEqual(hooks);
    expect(result).toHaveLength(3);
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });
});
