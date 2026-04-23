import { describe, expect, it } from 'vitest';
import { BacktestConsole } from '@/app/[locale]/(public)/indices/backtest/backtest-console';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';

describe('BacktestConsole — module export smoke', () => {
  it('exporta función componente', () => {
    expect(typeof BacktestConsole).toBe('function');
    expect(BacktestConsole.name).toBe('BacktestConsole');
  });
});

describe('BacktestConsole — scope_id human label rendering', () => {
  it('resolveZoneLabelSync produces human name for known estado code', () => {
    // Replicates the render path at line ~334 of backtest-console.tsx
    // where raw scope_id was previously shown to the user.
    const label = resolveZoneLabelSync({ scopeType: 'estado', scopeId: 'CMX' });
    expect(label).toBe('Ciudad de México');
    expect(label).not.toBe('CMX');
  });

  it('resolveZoneLabelSync converts slug to Title Case for colonia', () => {
    const label = resolveZoneLabelSync({ scopeType: 'colonia', scopeId: 'roma-norte' });
    expect(label).toBe('Roma Norte');
  });

  it('resolveZoneLabelSync falls back for UUID-shaped scope_id on colonia', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const label = resolveZoneLabelSync({ scopeType: 'colonia', scopeId: uuid });
    expect(label).toBe('[Zona sin nombre]');
    expect(label).not.toContain(uuid);
  });
});
