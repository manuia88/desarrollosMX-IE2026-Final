import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { classifyPhoto } from '../lib/photo-classify';

type AnthropicClient = Pick<Anthropic, 'messages'>;

function makeMockAnthropic(textResponse: string): AnthropicClient {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: textResponse }],
      }),
    },
  } as unknown as AnthropicClient;
}

describe('photo-classify', () => {
  it('classifies a photo to category + confidence', async () => {
    const client = makeMockAnthropic('{"category":"sala","confidence":0.92}');
    const result = await classifyPhoto(
      { imageUrl: 'https://example.com/photo.jpg' },
      client as Anthropic,
    );
    expect(result).toEqual({ category: 'sala', confidence: 0.92 });
  });

  it('strips markdown fences from LLM response', async () => {
    const client = makeMockAnthropic('```json\n{"category":"cocina","confidence":0.85}\n```');
    const result = await classifyPhoto(
      { imageUrl: 'https://example.com/x.jpg' },
      client as Anthropic,
    );
    expect(result.category).toBe('cocina');
    expect(result.confidence).toBe(0.85);
  });

  it('throws when category is invalid', async () => {
    const client = makeMockAnthropic('{"category":"unknown_cat","confidence":0.5}');
    await expect(
      classifyPhoto({ imageUrl: 'https://example.com/x.jpg' }, client as Anthropic),
    ).rejects.toThrow();
  });

  it('throws when confidence is out of range', async () => {
    const client = makeMockAnthropic('{"category":"plano","confidence":1.5}');
    await expect(
      classifyPhoto({ imageUrl: 'https://example.com/x.jpg' }, client as Anthropic),
    ).rejects.toThrow();
  });

  it('throws when response is malformed JSON', async () => {
    const client = makeMockAnthropic('not json at all');
    await expect(
      classifyPhoto({ imageUrl: 'https://example.com/x.jpg' }, client as Anthropic),
    ).rejects.toThrow();
  });
});
