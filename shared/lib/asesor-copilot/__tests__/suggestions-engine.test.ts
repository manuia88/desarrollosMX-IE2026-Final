import { describe, expect, it } from 'vitest';
import { buildSuggestions } from '@/shared/lib/asesor-copilot/suggestions-engine';

describe('buildSuggestions — copilot deterministic engine', () => {
  it('inactive lead >14 days → high priority re-engagement first', () => {
    const result = buildSuggestions({
      leadStatus: 'nurturing',
      lastContactDays: 30,
      buyerTwinDisc: null,
    });
    expect(result.length).toBeGreaterThan(0);
    const first = result[0];
    expect(first).toBeDefined();
    expect(first?.priority).toBe('high');
    expect(first?.actionKey).toBe('reEngagementTemplate');
  });

  it('DISC D → suggestion discDDirectMessage', () => {
    const result = buildSuggestions({
      leadStatus: 'new',
      lastContactDays: 2,
      buyerTwinDisc: 'D',
    });
    expect(result.some((s) => s.actionKey === 'discDDirectMessage')).toBe(true);
  });

  it('DISC I → suggestion discICall', () => {
    const result = buildSuggestions({
      leadStatus: 'new',
      lastContactDays: 2,
      buyerTwinDisc: 'I',
    });
    expect(result.some((s) => s.actionKey === 'discICall')).toBe(true);
  });

  it('DISC S → suggestion discSReassure', () => {
    const result = buildSuggestions({
      leadStatus: 'new',
      lastContactDays: 2,
      buyerTwinDisc: 'S',
    });
    expect(result.some((s) => s.actionKey === 'discSReassure')).toBe(true);
  });

  it('DISC C → suggestion discCData', () => {
    const result = buildSuggestions({
      leadStatus: 'new',
      lastContactDays: 2,
      buyerTwinDisc: 'C',
    });
    expect(result.some((s) => s.actionKey === 'discCData')).toBe(true);
  });

  it('familySize > 3 → suggestion familyAmenitiesAndSchools', () => {
    const result = buildSuggestions({
      leadStatus: 'new',
      lastContactDays: 1,
      buyerTwinDisc: null,
      familySize: 5,
    });
    expect(result.some((s) => s.actionKey === 'familyAmenitiesAndSchools')).toBe(true);
  });

  it('leadStatus qualified → high priority scheduleVisitPriority', () => {
    const result = buildSuggestions({
      leadStatus: 'qualified',
      lastContactDays: 1,
      buyerTwinDisc: null,
    });
    const visit = result.find((s) => s.actionKey === 'scheduleVisitPriority');
    expect(visit).toBeDefined();
    expect(visit?.priority).toBe('high');
  });

  it('determinism — same input twice returns identical output', () => {
    const input = {
      leadStatus: 'qualified' as const,
      lastContactDays: 30,
      buyerTwinDisc: 'C' as const,
      familySize: 4,
    };
    const a = buildSuggestions(input);
    const b = buildSuggestions(input);
    expect(a).toEqual(b);
  });

  it('always returns at most 3 suggestions sorted by priority', () => {
    const result = buildSuggestions({
      leadStatus: 'qualified',
      lastContactDays: 30,
      buyerTwinDisc: 'D',
      familySize: 5,
    });
    expect(result.length).toBeLessThanOrEqual(3);
    // Ensure sorted by priority rank (high < med < low) — first must not be lower priority than second.
    const rank: Record<string, number> = { high: 0, med: 1, low: 2 };
    for (let i = 0; i < result.length - 1; i += 1) {
      const cur = result[i];
      const next = result[i + 1];
      if (!cur || !next) continue;
      const curRank = rank[cur.priority] ?? 99;
      const nextRank = rank[next.priority] ?? 99;
      expect(curRank).toBeLessThanOrEqual(nextRank);
    }
  });

  it('default fallback when no signals trigger anything specific', () => {
    const result = buildSuggestions({
      leadStatus: 'new',
      lastContactDays: 0,
      buyerTwinDisc: null,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((s) => s.actionKey === 'sendPersonalizedListing')).toBe(true);
  });
});
