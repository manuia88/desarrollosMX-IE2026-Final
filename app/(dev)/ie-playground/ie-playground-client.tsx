'use client';

import type { CalculatorOutput } from '@/shared/lib/intelligence-engine/calculators/base';
import type { TierGateResult } from '@/shared/lib/intelligence-engine/calculators/tier-gate';
import { SCORE_REGISTRY } from '@/shared/lib/intelligence-engine/score-registry';
import {
  IntelligenceCard,
  type IntelligenceCardEntry,
} from '@/shared/ui/dopamine/intelligence-card';
import type { MethodologyShape } from '@/shared/ui/dopamine/score-transparency-panel';

function baseOutput(
  score_value: number,
  score_label: string,
  confidence: CalculatorOutput['confidence'],
): CalculatorOutput {
  return {
    score_value,
    score_label,
    components: { detail: 'mock' },
    inputs_used: {},
    confidence,
    citations: [],
    provenance: {
      sources: [{ name: 'mock', count: 1 }],
      computed_at: new Date('2026-04-01T00:00:00Z').toISOString(),
      calculator_version: '1.0.0',
    },
  };
}

function methodologyFor(scoreType: string): MethodologyShape {
  return {
    formula: `Fórmula ${scoreType} (mock playground)`,
    sources: ['mock'],
  };
}

const reg = (id: string) => SCORE_REGISTRY.find((e) => e.score_id === id);

const F08_ENTRY: IntelligenceCardEntry | null = (() => {
  const entry = reg('F08');
  if (!entry) return null;
  return {
    scoreOutput: baseOutput(84, 'ie.score.f08.excelente', 'high'),
    registryEntry: entry,
    methodology: methodologyFor('F08'),
    recommendations: {
      high: ['Zona excelente — mantener baseline'],
      medium: ['Áreas de oportunidad: ampliar ecosistema comercial'],
      low: ['Riesgo crítico, alerta stakeholders'],
      insufficient_data: ['Sin datos suficientes'],
    },
  };
})();

const A12_ENTRY: IntelligenceCardEntry | null = (() => {
  const entry = reg('A12');
  if (!entry) return null;
  return {
    scoreOutput: baseOutput(60, 'ie.score.a12.precio_cercano', 'medium'),
    registryEntry: entry,
    methodology: methodologyFor('A12'),
    recommendations: {
      high: ['Precio justo'],
      medium: ['Precio 10% sobre AVM — negociar'],
      low: ['Anomalía grande'],
      insufficient_data: ['Sin comparables'],
    },
  };
})();

const B02_ENTRY: IntelligenceCardEntry | null = (() => {
  const entry = reg('B02');
  if (!entry) return null;
  return {
    scoreOutput: baseOutput(72, 'ie.score.b02.margen_saludable', 'high'),
    registryEntry: entry,
    methodology: methodologyFor('B02'),
  };
})();

const H14_GATED: IntelligenceCardEntry | null = (() => {
  const entry = reg('H14');
  if (!entry) return null;
  const gate: TierGateResult = {
    gated: true,
    reason: 'tier_insufficient',
    requirement: 'Requiere señales de 30+ usuarios',
    current: 3,
    threshold: 30,
  };
  return {
    scoreOutput: baseOutput(0, 'ie.score.h14.insufficient', 'insufficient_data'),
    registryEntry: entry,
    methodology: methodologyFor('H14'),
    tierGate: gate,
  };
})();

const ENTRIES: readonly IntelligenceCardEntry[] = [
  F08_ENTRY,
  A12_ENTRY,
  B02_ENTRY,
  H14_GATED,
].filter((e): e is IntelligenceCardEntry => e !== null);

export function IePlaygroundClient() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="ie-playground-title">
          IE Playground — FASE 09 N1
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          dev-only · mock data · Playwright smoke tests
        </p>
      </header>
      <main>
        <section data-testid="ie-playground-cards">
          <IntelligenceCard entries={ENTRIES} showTransparency showRecommendations locale="es-MX" />
        </section>
      </main>
    </div>
  );
}
