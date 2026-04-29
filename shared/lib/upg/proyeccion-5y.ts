import { computeH16NeighborhoodEvolution } from '@/shared/lib/intelligence-engine/calculators/n2/h16-neighborhood-evolution';
import type { UpgDisclosure } from './types';

export type Proyeccion5yPhase =
  | 'inicial'
  | 'media'
  | 'tardia'
  | 'post_gentrificada'
  | 'desconocida';

export interface Proyeccion5yEngineInput {
  readonly f10Score: number | null;
  readonly f10Phase: Proyeccion5yPhase | null;
  readonly n03Velocity: number | null;
  readonly n04CrimeTrajectory: number | null;
  readonly priceIndex5yDeltaPct: number | null;
}

export interface Proyeccion5yEngineResult {
  readonly scoreEvolucion: number;
  readonly fase: string;
  readonly tendenciaDemografia: string;
  readonly tendenciaSeguridad: string;
  readonly narrativaTipo: string;
  readonly narrativaCompleta: string;
  readonly disclosure: UpgDisclosure;
}

export function runProyeccion5y(input: Proyeccion5yEngineInput): Proyeccion5yEngineResult {
  const compute = computeH16NeighborhoodEvolution({
    F10_score: input.f10Score,
    F10_fase: input.f10Phase,
    N03_velocity: input.n03Velocity,
    N04_crime_trajectory: input.n04CrimeTrajectory,
    price_index_zona_5y_delta_pct: input.priceIndex5yDeltaPct,
  });

  const c = compute.components;
  const narrativaCompleta = `Zona en fase ${c.fase_gentrificacion}, demografía ${c.tendencia_demografia}, seguridad ${c.tendencia_seguridad}. Score evolución 5y: ${c.score_evolucion}/100. ${
    c.narrativa_tipo === 'apreciacion_activa'
      ? 'Recomendación: invertir ahora, ventana corta antes de consolidación.'
      : c.narrativa_tipo === 'estable'
        ? 'Recomendación: monitorear 6 meses, métricas todavía volátiles.'
        : c.narrativa_tipo === 'gentrificada_post_2017'
          ? 'Recomendación: zona ya consolidada, márgenes comprimidos.'
          : c.narrativa_tipo === 'declive'
            ? 'Recomendación: evitar — métricas en declive sostenido.'
            : 'Datos insuficientes para emitir recomendación con confianza.'
  }`;

  const inputCount = [
    input.f10Score,
    input.n03Velocity,
    input.n04CrimeTrajectory,
    input.priceIndex5yDeltaPct,
  ].filter((v) => v !== null).length;

  const disclosure: UpgDisclosure =
    inputCount === 4 ? 'observed' : inputCount >= 2 ? 'mixed' : 'synthetic';

  return {
    scoreEvolucion: c.score_evolucion,
    fase: c.fase_gentrificacion,
    tendenciaDemografia: c.tendencia_demografia,
    tendenciaSeguridad: c.tendencia_seguridad,
    narrativaTipo: c.narrativa_tipo,
    narrativaCompleta,
    disclosure,
  };
}
