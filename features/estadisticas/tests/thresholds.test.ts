import { describe, expect, it } from 'vitest';
import { KPI_THRESHOLDS, tierForValue } from '../lib/thresholds';

describe('thresholds — semáforo tiers', () => {
  it('returns red for null values', () => {
    expect(tierForValue('pendingInquiries', null)).toBe('red');
    expect(tierForValue('firstResponseTime', null)).toBe('red');
  });

  it('lower-is-better: pendingInquiries thresholds', () => {
    expect(tierForValue('pendingInquiries', 0)).toBe('green');
    expect(tierForValue('pendingInquiries', 14)).toBe('green');
    expect(tierForValue('pendingInquiries', 15)).toBe('yellow');
    expect(tierForValue('pendingInquiries', 59)).toBe('yellow');
    expect(tierForValue('pendingInquiries', 60)).toBe('red');
    expect(tierForValue('pendingInquiries', 200)).toBe('red');
  });

  it('higher-is-better: visitRate thresholds', () => {
    expect(tierForValue('visitRate', 100)).toBe('green');
    expect(tierForValue('visitRate', 75)).toBe('green');
    expect(tierForValue('visitRate', 50)).toBe('yellow');
    expect(tierForValue('visitRate', 49)).toBe('red');
    expect(tierForValue('visitRate', 0)).toBe('red');
  });

  it('higher-is-better without yellow band: interactionsVolume', () => {
    expect(tierForValue('interactionsVolume', 3)).toBe('green');
    expect(tierForValue('interactionsVolume', 2.99)).toBe('red');
  });

  it('exposes 11 KPI thresholds', () => {
    expect(Object.keys(KPI_THRESHOLDS)).toHaveLength(11);
  });
});
