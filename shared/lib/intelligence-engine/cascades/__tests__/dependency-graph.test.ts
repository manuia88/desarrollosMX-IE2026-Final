import { describe, expect, it } from 'vitest';
import {
  CASCADE_GRAPH,
  exportGraphJson,
  exportSequenceMermaid,
  getScoresForCascade,
  getScoresForGeoSource,
  summarizeGraph,
} from '../dependency-graph';

describe('CASCADE_GRAPH (F1)', () => {
  it('contiene las 5 cascadas formales NO geo', () => {
    expect(CASCADE_GRAPH.unit_sold).toBeDefined();
    expect(CASCADE_GRAPH.price_changed).toBeDefined();
    expect(CASCADE_GRAPH.macro_updated).toBeDefined();
    expect(CASCADE_GRAPH.feedback_registered).toBeDefined();
    expect(CASCADE_GRAPH.search_behavior).toBeDefined();
  });

  it('unit_sold tiene B08 primero per ADR-010 §D7', () => {
    expect(CASCADE_GRAPH.unit_sold[0]).toBe('B08');
    expect(CASCADE_GRAPH.unit_sold).toContain('E01');
  });

  it('geo_data_updated.fgj = F01, N04, N09', () => {
    expect(getScoresForGeoSource('fgj')).toEqual(['F01', 'N04', 'N09']);
  });

  it('geo_data_updated.denue incluye F03 y N01', () => {
    const denue = getScoresForGeoSource('denue');
    expect(denue).toContain('F03');
    expect(denue).toContain('N01');
  });

  it('getScoresForGeoSource para source unknown → []', () => {
    expect(getScoresForGeoSource('nonexistent')).toEqual([]);
  });

  it('getScoresForCascade price_changed incluye A12, A01', () => {
    const arr = getScoresForCascade('price_changed');
    expect(arr).toContain('A12');
    expect(arr).toContain('A01');
  });

  it('exportSequenceMermaid genera mermaid válido', () => {
    const out = exportSequenceMermaid();
    expect(out).toMatch(/^flowchart LR/);
    expect(out).toContain('unit_sold');
    expect(out).toContain('B08');
    expect(out).toContain('geo_fgj');
    expect(out).toContain('F01');
  });

  it('summarizeGraph counts consistentes', () => {
    const s = summarizeGraph();
    expect(s.total_cascades).toBe(5 + Object.keys(CASCADE_GRAPH.geo_data_updated).length);
    expect(s.total_edges).toBeGreaterThan(0);
    expect(s.unique_scores_affected).toBeGreaterThan(0);
  });

  it('exportGraphJson retorna el graph completo', () => {
    const json = exportGraphJson();
    expect(json).toBe(CASCADE_GRAPH);
  });
});
