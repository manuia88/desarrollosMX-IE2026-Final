import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cached,
  cacheSize,
  clearCache,
  geoCacheKey,
  geoCacheTag,
  get,
  invalidate,
  invalidateByTag,
  invalidatePattern,
  set,
} from '../index';

afterEach(() => {
  clearCache();
});

describe('runtime-cache', () => {
  it('get returns undefined if miss', () => {
    expect(get('missing')).toBeUndefined();
  });

  it('set + get round-trip con TTL', () => {
    set('k1', { foo: 1 }, { ttlSeconds: 60 });
    expect(get('k1')).toEqual({ foo: 1 });
  });

  it('entry expira tras TTL', async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    set('k2', 'v', { ttlSeconds: 1 });
    expect(get('k2')).toBe('v');
    vi.setSystemTime(now + 1500);
    expect(get('k2')).toBeUndefined();
    vi.useRealTimers();
  });

  it('invalidate key removes entry', () => {
    set('k3', 'v', { ttlSeconds: 60 });
    expect(invalidate('k3')).toBe(true);
    expect(get('k3')).toBeUndefined();
  });

  it('invalidateByTag borra todos los entries con ese tag', () => {
    set('a', 1, { ttlSeconds: 60, tags: ['geo:fgj', 'zone:cdmx-5'] });
    set('b', 2, { ttlSeconds: 60, tags: ['geo:fgj'] });
    set('c', 3, { ttlSeconds: 60, tags: ['geo:denue'] });
    expect(invalidateByTag('geo:fgj')).toBe(2);
    expect(get('a')).toBeUndefined();
    expect(get('b')).toBeUndefined();
    expect(get('c')).toBe(3);
  });

  it('invalidatePattern borra por regex', () => {
    set('geo:fgj:cdmx-5:2026-04:1.5', 'x', { ttlSeconds: 60 });
    set('geo:fgj:cdmx-7:2026-04:1.5', 'y', { ttlSeconds: 60 });
    set('zone:cdmx-5', 'z', { ttlSeconds: 60 });
    expect(invalidatePattern(/^geo:fgj:/)).toBe(2);
    expect(get('zone:cdmx-5')).toBe('z');
  });

  it('cached() ejecuta fn una sola vez bajo cache hit', async () => {
    const fn = vi.fn(async () => 42);
    const v1 = await cached('test:1', 60, ['tag'], fn);
    const v2 = await cached('test:1', 60, ['tag'], fn);
    expect(v1).toBe(42);
    expect(v2).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cached() refetcha tras invalidation', async () => {
    const fn = vi.fn(async () => Math.random());
    await cached('test:2', 60, ['t'], fn);
    invalidateByTag('t');
    await cached('test:2', 60, ['t'], fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('geoCacheKey + geoCacheTag schema estable', () => {
    const key = geoCacheKey({ source: 'fgj', zoneId: 'cdmx-5', period: '2026-04', radiusKm: 1.5 });
    expect(key).toBe('geo:fgj:cdmx-5:2026-04:1.5');
    expect(geoCacheTag('fgj')).toBe('geo:fgj');
  });

  it('clearCache vacía store', () => {
    set('a', 1, { ttlSeconds: 60 });
    set('b', 2, { ttlSeconds: 60 });
    expect(cacheSize()).toBe(2);
    clearCache();
    expect(cacheSize()).toBe(0);
  });
});
