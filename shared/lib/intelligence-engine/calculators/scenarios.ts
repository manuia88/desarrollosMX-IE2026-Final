// D29 FASE 10 SESIÓN 2/3 — multi-scenario output helper.
//
// Patrón: calculators compuestos (A07/A09/A11) definen scenarios_config en su
// methodology y runWithScenarios ejecuta una función compute() N veces con
// weights_override distintos, devolviendo un mapa { name: {value, confidence,
// rationale} }.
//
// El calculator decide cómo exponer los escenarios en CalculatorOutput.scenarios
// (ej. A11 macro: boom/stagnation/recession; A09 risk: optimistic/base/pessimistic).
//
// No persiste nada — solo compone resultados. La persistencia va en zone_scores
// / project_scores vía CalculatorOutput.scenarios (jsonb).

import type { Confidence, ScenarioOutput } from './base';

export interface ScenariosConfig<TWeightsKey extends string = string> {
  readonly names: readonly string[];
  readonly weights_override: Readonly<Record<string, Readonly<Record<TWeightsKey, number>>>>;
  readonly confidence_override?: Readonly<Record<string, Confidence>>;
  readonly rationales?: Readonly<Record<string, string>>;
}

export interface RunScenariosInput<TWeightsKey extends string, TComponents> {
  readonly config: ScenariosConfig<TWeightsKey>;
  readonly computeFn: (weights: Readonly<Record<TWeightsKey, number>>) => {
    readonly value: number;
    readonly confidence: Confidence;
    readonly components?: TComponents;
  };
}

export function runWithScenarios<TWeightsKey extends string, TComponents>(
  input: RunScenariosInput<TWeightsKey, TComponents>,
): Record<string, ScenarioOutput> {
  const result: Record<string, ScenarioOutput> = {};
  for (const name of input.config.names) {
    const weights = input.config.weights_override[name];
    if (!weights) continue;
    const computed = input.computeFn(weights);
    const scenarioConfidence = input.config.confidence_override?.[name] ?? computed.confidence;
    const scenario: ScenarioOutput = {
      value: computed.value,
      confidence: scenarioConfidence,
      ...(input.config.rationales?.[name] ? { rationale: input.config.rationales[name] } : {}),
    };
    result[name] = scenario;
  }
  return result;
}

// Helper simple — crea una ScenariosConfig desde un objeto plano.
export function defineScenarios<TWeightsKey extends string>(
  scenarios: Record<
    string,
    { weights: Record<TWeightsKey, number>; confidence?: Confidence; rationale?: string }
  >,
): ScenariosConfig<TWeightsKey> {
  const names: string[] = [];
  const weights_override: Record<string, Record<TWeightsKey, number>> = {};
  const confidence_override: Record<string, Confidence> = {};
  const rationales: Record<string, string> = {};
  for (const [name, spec] of Object.entries(scenarios)) {
    names.push(name);
    weights_override[name] = spec.weights;
    if (spec.confidence) confidence_override[name] = spec.confidence;
    if (spec.rationale) rationales[name] = spec.rationale;
  }
  return {
    names,
    weights_override,
    confidence_override,
    rationales,
  };
}
