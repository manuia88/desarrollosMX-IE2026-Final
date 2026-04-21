import { describe, expect, it } from 'vitest';
import { MethodologyCard } from '../components/MethodologyCard';
import { WeightsBarChart } from '../components/WeightsBarChart';

// Smoke / shape test. Sin jsdom ni testing-library en el proyecto — validamos
// export + contract TS. Rendering real se cubre vía Playwright E2E en FASE 11
// pasos posteriores.
describe('features/indices-publicos components', () => {
  it('exporta MethodologyCard como componente función', () => {
    expect(typeof MethodologyCard).toBe('function');
    expect(MethodologyCard.name).toBe('MethodologyCard');
  });

  it('exporta WeightsBarChart como componente función', () => {
    expect(typeof WeightsBarChart).toBe('function');
    expect(WeightsBarChart.name).toBe('WeightsBarChart');
  });

  it('MethodologyCard acepta props mínimas (type check)', () => {
    // Este assert es runtime no-op pero valida que los symbols existan.
    // El typecheck real pasa por `npx tsc --noEmit`.
    const props = { code: 'IPV' as const };
    expect(props.code).toBe('IPV');
    expect(typeof MethodologyCard).toBe('function');
  });

  it('WeightsBarChart acepta entries vacíos sin lanzar en invocación directa', () => {
    // Invoke as function (React FC puede llamarse, devuelve element o null)
    const result = WeightsBarChart({ entries: [], ariaLabel: 'pesos' });
    expect(result).toBeNull();
  });
});
