import {
  type B03UnidadInput,
  type B03UnidadSuggestion,
  computeB03PricingAutopilot,
} from '@/shared/lib/intelligence-engine/calculators/n2/b03-pricing-autopilot';
import type { UpgDisclosure } from './types';

export interface PricingAdvisorUnidad {
  readonly unidadId: string;
  readonly precioActual: number;
  readonly diasEnMercado: number;
  readonly absorcionMensual: number;
}

export interface PricingAdvisorMarketContext {
  readonly precioPromedioM2Zona: number | null;
  readonly muestrasMercado: number;
}

export interface PricingAdvisorEngineInput {
  readonly projectId: string;
  readonly unidades: readonly PricingAdvisorUnidad[];
  readonly momentumZona: number;
  readonly demandaAlta: boolean;
  readonly market: PricingAdvisorMarketContext;
}

export interface PricingAdvisorSuggestion extends B03UnidadSuggestion {
  readonly recomendacionTexto: string;
}

export interface PricingAdvisorEngineResult {
  readonly suggestions: readonly PricingAdvisorSuggestion[];
  readonly summary: {
    readonly total: number;
    readonly bajadas: number;
    readonly subidas: number;
    readonly hold: number;
    readonly deltaAvgPct: number;
  };
  readonly marketSignal: 'below_market' | 'aligned' | 'above_market' | 'unknown';
  readonly disclosure: UpgDisclosure;
}

export function runPricingAdvisorEngine(
  input: PricingAdvisorEngineInput,
): PricingAdvisorEngineResult {
  if (input.unidades.length === 0) {
    return {
      suggestions: [],
      summary: { total: 0, bajadas: 0, subidas: 0, hold: 0, deltaAvgPct: 0 },
      marketSignal: 'unknown',
      disclosure: 'synthetic',
    };
  }

  const inputs: B03UnidadInput[] = input.unidades.map((u) => ({
    unidadId: u.unidadId,
    precio_actual: u.precioActual,
    dias_en_mercado: u.diasEnMercado,
    absorcion_mensual: u.absorcionMensual,
  }));

  const compute = computeB03PricingAutopilot({
    projectId: input.projectId,
    unidades: inputs,
    momentum_zona: input.momentumZona,
    demanda_alta: input.demandaAlta,
  });

  const avgUnitPrice =
    input.unidades.reduce((acc, u) => acc + u.precioActual, 0) / input.unidades.length;
  const marketSignal: PricingAdvisorEngineResult['marketSignal'] =
    input.market.precioPromedioM2Zona === null || input.market.muestrasMercado < 5
      ? 'unknown'
      : avgUnitPrice / 80 < input.market.precioPromedioM2Zona * 0.95
        ? 'below_market'
        : avgUnitPrice / 80 > input.market.precioPromedioM2Zona * 1.05
          ? 'above_market'
          : 'aligned';

  const suggestions: PricingAdvisorSuggestion[] = compute.components.unidades.map((s) => {
    const delta = s.delta_pct;
    const recomendacionTexto =
      delta < -3
        ? `Bajar ${Math.abs(delta).toFixed(1)}% para acelerar venta`
        : delta > 3
          ? `Subir ${delta.toFixed(1)}% — demanda + momentum lo soportan`
          : 'Mantener — precio óptimo según señales actuales';
    return { ...s, recomendacionTexto };
  });

  const disclosure: UpgDisclosure =
    input.market.muestrasMercado >= 10
      ? 'observed'
      : input.market.muestrasMercado >= 3
        ? 'mixed'
        : 'synthetic';

  return {
    suggestions,
    summary: {
      total: compute.components.unidades_count,
      bajadas: compute.components.bajadas_count,
      subidas: compute.components.subidas_count,
      hold: compute.components.hold_count,
      deltaAvgPct: compute.components.delta_avg_pct,
    },
    marketSignal,
    disclosure,
  };
}
