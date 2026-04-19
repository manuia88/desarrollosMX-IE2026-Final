import { describe, expect, it } from 'vitest';
import {
  type CandidateCluster,
  classifyCluster,
  classifyClusters,
} from '../lib/invisible-hotels/cluster-detector';

function buildCandidate(overrides: Partial<CandidateCluster> = {}): CandidateCluster {
  return {
    host_id: 'H-1',
    market_id: '00000000-0000-0000-0000-000000000001',
    listings_count: 7,
    center_lon: -99.1,
    center_lat: 19.4,
    bounding_radius_m: 150,
    listing_ids: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'],
    listings_meta: [],
    ...overrides,
  };
}

describe('classifyCluster', () => {
  it('host_id válido + radius 150m → confidence 0.7 + host_id_proximity', () => {
    const result = classifyCluster(buildCandidate());
    expect(result.detection_method).toBe('host_id_proximity');
    expect(result.confidence).toBeCloseTo(0.7, 2);
    expect(result.heuristics.host_id_match).toBe(true);
    expect(result.heuristics.tight_cluster).toBe(false);
  });

  it('listings_count ≥ 10 sumada a host_id_match → +0.10 boost', () => {
    const result = classifyCluster(buildCandidate({ listings_count: 12 }));
    expect(result.confidence).toBeCloseTo(0.8, 2);
  });

  it('tight cluster (radius<50m) penaliza -0.20', () => {
    const result = classifyCluster(buildCandidate({ bounding_radius_m: 30 }));
    expect(result.confidence).toBeCloseTo(0.5, 2);
    expect(result.heuristics.tight_cluster).toBe(true);
  });

  it('host_id missing + name_prefix_match → name_prefix_match method', () => {
    const result = classifyCluster(
      buildCandidate({
        host_id: '',
        listings_meta: [
          { listing_id: 'L1', listing_name: 'CondesaSuites #101 Premium' },
          { listing_id: 'L2', listing_name: 'CondesaSuites #102 Premium' },
          { listing_id: 'L3', listing_name: 'CondesaSuites #103 Premium' },
          { listing_id: 'L4', listing_name: 'CondesaSuites #104 Premium' },
          { listing_id: 'L5', listing_name: 'CondesaSuites #105 Premium' },
        ],
      }),
    );
    expect(result.detection_method).toBe('name_prefix_match');
    expect(result.heuristics.name_prefix_match).toBe(true);
    expect(result.heuristics.common_prefix).toBeDefined();
    expect(result.confidence).toBeCloseTo(0.5, 2); // 0.4 base + 0.1 name match.
  });

  it('host_id_match + name_prefix_match → composite + máximo confidence', () => {
    const result = classifyCluster(
      buildCandidate({
        listings_count: 12,
        listings_meta: Array.from({ length: 7 }, (_, i) => ({
          listing_id: `L${i + 1}`,
          listing_name: `RomaSur Lofts Suite ${i + 1}`,
        })),
      }),
    );
    expect(result.detection_method).toBe('composite');
    expect(result.confidence).toBeCloseTo(0.9, 2);
  });

  it('confidence clamp [0,1] (caso: tight + low base)', () => {
    const result = classifyCluster(
      buildCandidate({ host_id: '', bounding_radius_m: 20, listings_meta: [] }),
    );
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('listing_ids preservados en el output', () => {
    const result = classifyCluster(buildCandidate());
    expect(result.listing_ids).toHaveLength(7);
  });
});

describe('classifyClusters', () => {
  it('mapea N candidates a N detected', () => {
    const result = classifyClusters([
      buildCandidate({ host_id: 'H-A' }),
      buildCandidate({ host_id: 'H-B', listings_count: 15 }),
      buildCandidate({ host_id: 'H-C', bounding_radius_m: 25 }),
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]?.host_id).toBe('H-A');
    expect(result[1]?.confidence).toBeGreaterThan(result[0]?.confidence ?? 0);
    expect(result[2]?.heuristics.tight_cluster).toBe(true);
  });
});
