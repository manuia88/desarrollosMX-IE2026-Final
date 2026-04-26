import { describe, expect, it } from 'vitest';
import { buildBreadcrumb, getActiveModuleId } from '../lib/active-module';
import { ASESOR_NAV_ITEMS } from '../lib/nav-items';

describe('getActiveModuleId', () => {
  it('returns the matching module id when path begins with route', () => {
    expect(getActiveModuleId('/es-MX/asesores/dashboard', 'es-MX')).toBe('dashboard');
    expect(getActiveModuleId('/es-MX/asesores/desarrollos/abc', 'es-MX')).toBe('desarrollos');
    expect(getActiveModuleId('/en-US/asesores/contactos', 'en-US')).toBe('contactos');
  });

  it('returns null when path matches no module', () => {
    expect(getActiveModuleId('/es-MX/profile', 'es-MX')).toBeNull();
    expect(getActiveModuleId('/es-MX/auth/login', 'es-MX')).toBeNull();
  });

  it('handles path without locale prefix gracefully', () => {
    expect(getActiveModuleId('/asesores/dashboard', 'es-MX')).toBe('dashboard');
  });
});

describe('buildBreadcrumb', () => {
  it('returns empty array when no module matches', () => {
    expect(buildBreadcrumb('/es-MX/perfil', 'es-MX')).toEqual([]);
  });

  it('returns single breadcrumb segment for matching module', () => {
    const breadcrumb = buildBreadcrumb('/es-MX/asesores/dashboard', 'es-MX');
    expect(breadcrumb).toHaveLength(1);
    expect(breadcrumb[0]?.labelKey).toBe('breadcrumb.dashboard');
  });
});

describe('ASESOR_NAV_ITEMS', () => {
  it('contains 11 unique modules (9 primary + 2 secondary)', () => {
    expect(ASESOR_NAV_ITEMS).toHaveLength(11);
    const primary = ASESOR_NAV_ITEMS.filter((i) => i.group === 'primary');
    const secondary = ASESOR_NAV_ITEMS.filter((i) => i.group === 'secondary');
    expect(primary).toHaveLength(9);
    expect(secondary).toHaveLength(2);
  });

  it('every item has unique id', () => {
    const ids = new Set(ASESOR_NAV_ITEMS.map((i) => i.id));
    expect(ids.size).toBe(ASESOR_NAV_ITEMS.length);
  });
});
