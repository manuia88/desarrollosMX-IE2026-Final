import { describe, expect, it } from 'vitest';
import { generateNarrativeArc } from '../narrative-generator';

describe('narrative-generator F14.F.9', () => {
  it('genera arco fallback en NODE_ENV=test (sin Claude)', async () => {
    const result = await generateNarrativeArc('user-1', null, 5, { title: 'Test' });
    expect(result.aiGenerated).toBe(false);
    expect(result.arc.length).toBe(5);
    expect(result.arc[0]?.episode_number).toBe(1);
    expect(result.arc[0]?.phase).toBe('planificacion');
    expect(result.arc[4]?.phase).toBe('entrega');
    expect(result.costUsd).toBe(0);
  });

  it('fallback respeta count > 5 con phase=custom para ep extras', async () => {
    const result = await generateNarrativeArc('user-1', null, 7);
    expect(result.arc.length).toBe(7);
    expect(result.arc[5]?.phase).toBe('entrega');
    expect(result.arc[6]?.phase).toBe('entrega');
  });

  it('fallback maneja count=2', async () => {
    const result = await generateNarrativeArc('user-1', null, 2);
    expect(result.arc.length).toBe(2);
    expect(result.arc[0]?.phase).toBe('planificacion');
    expect(result.arc[1]?.phase).toBe('construccion');
  });
});
