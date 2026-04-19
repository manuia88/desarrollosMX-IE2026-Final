import { describe, expect, it } from 'vitest';
import { BudgetExceededError } from '@/shared/lib/ingest/types';
import {
  defaultApplyListingSampler,
  type PendingPhoto,
  PHOTO_CV_CONFIDENCE_THRESHOLD,
  processPhotoCvBatch,
} from '../lib/photos/photo-cv-worker';

function mockPhoto(overrides: Partial<PendingPhoto> = {}): PendingPhoto {
  return {
    id: 1,
    platform: 'airbnb',
    listing_id: 'L1',
    photo_url: 'https://example.com/photo.jpg',
    order_index: 0,
    ...overrides,
  };
}

describe('defaultApplyListingSampler', () => {
  it('toma 20% (ceil) de fotos por listing', () => {
    const photos: PendingPhoto[] = [];
    for (let i = 0; i < 10; i += 1) {
      photos.push(mockPhoto({ id: i + 1, order_index: i, listing_id: 'L1' }));
    }
    for (let i = 0; i < 5; i += 1) {
      photos.push(mockPhoto({ id: 100 + i, order_index: i, listing_id: 'L2' }));
    }
    const sampled = defaultApplyListingSampler(photos, 0.2);
    // L1: ceil(10*0.2)=2, L2: ceil(5*0.2)=1
    expect(sampled).toHaveLength(3);
  });

  it('mínimo 1 foto por listing aún con sample muy bajo', () => {
    const photos = [mockPhoto({ id: 1, listing_id: 'L1' })];
    const sampled = defaultApplyListingSampler(photos, 0.01);
    expect(sampled).toHaveLength(1);
  });

  it('orden estable por order_index', () => {
    const photos: PendingPhoto[] = [
      mockPhoto({ id: 3, order_index: 2 }),
      mockPhoto({ id: 1, order_index: 0 }),
      mockPhoto({ id: 2, order_index: 1 }),
    ];
    const sampled = defaultApplyListingSampler(photos, 1.0);
    expect(sampled.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it('agrupa por (platform, listing_id) — mismo listing_id en VRBO vs Airbnb separados', () => {
    const photos = [
      mockPhoto({ id: 1, platform: 'airbnb', listing_id: 'L1', order_index: 0 }),
      mockPhoto({ id: 2, platform: 'airbnb', listing_id: 'L1', order_index: 1 }),
      mockPhoto({ id: 3, platform: 'vrbo', listing_id: 'L1', order_index: 0 }),
    ];
    const sampled = defaultApplyListingSampler(photos, 0.5);
    // airbnb L1: ceil(2*0.5)=1, vrbo L1: ceil(1*0.5)=1.
    expect(sampled).toHaveLength(2);
  });
});

describe('processPhotoCvBatch', () => {
  it('procesa fotos sampled y persiste cv_labels', async () => {
    const persisted: number[] = [];
    const result = await processPhotoCvBatch(
      { batchSize: 10, samplePctPerListing: 1.0 },
      {
        fetchPendingPhotos: async () => [
          mockPhoto({ id: 1, listing_id: 'L1' }),
          mockPhoto({ id: 2, listing_id: 'L2' }),
        ],
        callModel: async () => ({
          object: {
            amenities: ['kitchen', 'wifi'],
            room_type: 'kitchen',
            quality_dimensions: { lighting: 0.8, composition: 0.7, resolution_ok: true },
            overall_quality_score: 0.8,
            confidence: 0.9,
          },
          usage: { inputTokens: 2000, outputTokens: 200 },
        }),
        persistResult: async (photo) => {
          persisted.push(photo.id);
        },
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => undefined,
      },
    );

    expect(result.fetched).toBe(2);
    expect(result.sampled).toBe(2);
    expect(result.processed).toBe(2);
    expect(result.updated).toBe(2);
    expect(persisted).toEqual([1, 2]);
    expect(result.cost_usd_actual).toBeGreaterThan(0);
  });

  it('rechaza foto con confidence < threshold', async () => {
    const result = await processPhotoCvBatch(
      { batchSize: 1, samplePctPerListing: 1.0 },
      {
        fetchPendingPhotos: async () => [mockPhoto()],
        callModel: async () => ({
          object: {
            amenities: [],
            room_type: 'unknown',
            quality_dimensions: { lighting: 0.5, composition: 0.5, resolution_ok: false },
            overall_quality_score: 0.3,
            confidence: PHOTO_CV_CONFIDENCE_THRESHOLD - 0.1,
          },
          usage: { inputTokens: 1000, outputTokens: 100 },
        }),
        persistResult: async () => {
          throw new Error('should_not_persist');
        },
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => undefined,
      },
    );
    expect(result.rejected_low_confidence).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('detiene batch al exceder presupuesto', async () => {
    let calls = 0;
    const result = await processPhotoCvBatch(
      { batchSize: 5, samplePctPerListing: 1.0 },
      {
        fetchPendingPhotos: async () =>
          Array.from({ length: 5 }, (_, i) => mockPhoto({ id: i + 1, listing_id: `L${i}` })),
        callModel: async () => {
          calls += 1;
          return {
            object: {
              amenities: [],
              room_type: 'bedroom',
              quality_dimensions: { lighting: 0.7, composition: 0.7, resolution_ok: true },
              overall_quality_score: 0.7,
              confidence: 0.85,
            },
            usage: { inputTokens: 1500, outputTokens: 150 },
          };
        },
        persistResult: async () => undefined,
        checkBudget: async () => {
          if (calls < 2) return { allowed: true, alertThresholdReached: false };
          throw new BudgetExceededError('anthropic', 100, 100);
        },
        recordCost: async () => undefined,
      },
    );
    expect(result.stopped_reason).toBe('budget_exceeded');
    expect(result.updated).toBe(2);
  });

  it('no_pending_photos cuando queue vacía', async () => {
    const result = await processPhotoCvBatch(
      { batchSize: 50 },
      {
        fetchPendingPhotos: async () => [],
        callModel: async () => {
          throw new Error('should_not_call_model');
        },
        persistResult: async () => undefined,
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => undefined,
      },
    );
    expect(result.stopped_reason).toBe('no_pending_photos');
  });

  it('dryRun no persiste ni cobra', async () => {
    let persisted = 0;
    let recorded = 0;
    const result = await processPhotoCvBatch(
      { batchSize: 1, samplePctPerListing: 1.0, dryRun: true },
      {
        fetchPendingPhotos: async () => [mockPhoto()],
        callModel: async () => ({
          object: {
            amenities: ['wifi'],
            room_type: 'living_room',
            quality_dimensions: { lighting: 0.7, composition: 0.7, resolution_ok: true },
            overall_quality_score: 0.7,
            confidence: 0.9,
          },
          usage: { inputTokens: 1500, outputTokens: 150 },
        }),
        persistResult: async () => {
          persisted += 1;
        },
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => {
          recorded += 1;
        },
      },
    );
    expect(result.updated).toBe(1);
    expect(persisted).toBe(0);
    expect(recorded).toBe(0);
  });
});
