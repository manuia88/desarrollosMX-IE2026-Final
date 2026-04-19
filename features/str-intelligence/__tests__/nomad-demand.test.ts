import { describe, expect, it } from 'vitest';
import {
  computeNomadDemand,
  NOMAD_REVIEW_TOPICS,
  NOMAD_WEIGHTS,
  nomadMentionsFromTopicCounts,
} from '../lib/scores/nomad-demand';

describe('computeNomadDemand', () => {
  it('pesos suman 1', () => {
    const sum = NOMAD_WEIGHTS.trends + NOMAD_WEIGHTS.reviews + NOMAD_WEIGHTS.length_of_stay;
    expect(sum).toBeCloseTo(1, 6);
  });

  it('todos inputs altos → score ~ 100, confidence=high', () => {
    const result = computeNomadDemand({
      trends_avg_interest: 100,
      trends_keywords_count: 4,
      nomad_topic_mentions: 60,
      reviews_analyzed: 200,
      avg_length_of_stay: 14,
      length_of_stay_samples: 12,
    });
    expect(result.score).toBeCloseTo(100, 1);
    expect(result.confidence).toBe('high');
  });

  it('inputs vacios → score=0, confidence=insufficient_data', () => {
    const result = computeNomadDemand({
      trends_avg_interest: null,
      trends_keywords_count: 0,
      nomad_topic_mentions: null,
      reviews_analyzed: 0,
      avg_length_of_stay: null,
      length_of_stay_samples: 0,
    });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe('insufficient_data');
  });

  it('LoS=7d → component=50; LoS=14d+ → 100', () => {
    const mid = computeNomadDemand({
      trends_avg_interest: null,
      trends_keywords_count: 0,
      nomad_topic_mentions: null,
      reviews_analyzed: 0,
      avg_length_of_stay: 7,
      length_of_stay_samples: 6,
    });
    const high = computeNomadDemand({
      trends_avg_interest: null,
      trends_keywords_count: 0,
      nomad_topic_mentions: null,
      reviews_analyzed: 0,
      avg_length_of_stay: 14,
      length_of_stay_samples: 6,
    });
    expect(mid.components.length_of_stay).toBeCloseTo(50, 1);
    expect(high.components.length_of_stay).toBe(100);
  });

  it('reviews 30%+ con tópicos nomad → component=100', () => {
    const result = computeNomadDemand({
      trends_avg_interest: null,
      trends_keywords_count: 0,
      nomad_topic_mentions: 50,
      reviews_analyzed: 100,
      avg_length_of_stay: null,
      length_of_stay_samples: 0,
    });
    expect(result.components.reviews).toBe(100);
  });

  it('renormaliza pesos cuando faltan inputs', () => {
    const result = computeNomadDemand({
      trends_avg_interest: 60,
      trends_keywords_count: 4,
      nomad_topic_mentions: null,
      reviews_analyzed: 0,
      avg_length_of_stay: null,
      length_of_stay_samples: 0,
    });
    expect(result.weights_applied.trends).toBeCloseTo(1, 6);
    expect(result.score).toBeCloseTo(60, 1);
    expect(result.confidence).toBe('low');
  });

  it('2 contribuyentes → confidence=medium', () => {
    const result = computeNomadDemand({
      trends_avg_interest: 60,
      trends_keywords_count: 4,
      nomad_topic_mentions: 30,
      reviews_analyzed: 100,
      avg_length_of_stay: null,
      length_of_stay_samples: 0,
    });
    expect(result.confidence).toBe('medium');
  });
});

describe('nomadMentionsFromTopicCounts', () => {
  it('suma topic_counts solo de NOMAD_REVIEW_TOPICS', () => {
    const counts: Record<string, number> = {
      wifi: 5,
      coworking: 3,
      long_stay: 2,
      cleanliness: 50, // ignorar.
      noise: 10, // ignorar.
    };
    const total = nomadMentionsFromTopicCounts(counts);
    expect(total).toBe(10);
  });

  it('null counts → null', () => {
    expect(nomadMentionsFromTopicCounts(null)).toBeNull();
  });

  it('empty counts → 0', () => {
    expect(nomadMentionsFromTopicCounts({})).toBe(0);
  });

  it('NOMAD_REVIEW_TOPICS contiene tópicos clave', () => {
    expect(NOMAD_REVIEW_TOPICS).toContain('wifi');
    expect(NOMAD_REVIEW_TOPICS).toContain('coworking');
    expect(NOMAD_REVIEW_TOPICS).toContain('long_stay');
  });
});
