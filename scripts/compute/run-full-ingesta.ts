#!/usr/bin/env node
/**
 * Orquestrador wrapper de la pipeline foundational IE + DMX.
 *
 * Ejecuta los scripts ingest (01-03) y compute (01-13) en orden topológico
 * vía `child_process.spawn`. NO re-ejecuta la lógica interna — cada step es un
 * proceso hijo Node independiente, stdout/stderr se proxean con prefijo
 * `[orchestrator][STEP_ID]`. Al finalizar, imprime un JSON summary con status,
 * duration y exit_code por step.
 *
 * Uso:
 *   node --experimental-strip-types \
 *     --experimental-transform-types \
 *     --import=./scripts/compute/_register-ts-loader.mjs \
 *     scripts/compute/run-full-ingesta.ts [flags]
 *
 * Flags:
 *   --skip=IDs            Skip steps (coma-sep, ej: --skip=C13,C10)
 *   --only=ID             Ejecuta solo un step (ej: --only=C13). Excluye --skip.
 *   --dry-run             Propaga --dry-run a todos los scripts hijo.
 *   --cost-cap-usd=N      Propaga --cost-cap-usd=N solo al step C13.
 *   --stop-on-fail=false  No abortar al primer fail (default true).
 *   --help | -h           Imprime ayuda y exit(0).
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Pipeline topology
// ---------------------------------------------------------------------------

export type PipelineStep = {
  readonly id: string;
  readonly label: string;
  readonly script: string;
};

export const PIPELINE_STEPS: readonly PipelineStep[] = [
  // Ingest foundational (scripts/ingest/)
  {
    id: 'I01',
    label: 'ingest-geo-boundaries',
    script: 'scripts/ingest/01_ingest-geo-boundaries.ts',
  },
  {
    id: 'I02',
    label: 'ingest-macro-banxico-inegi',
    script: 'scripts/ingest/02_ingest-macro-banxico-inegi.ts',
  },
  { id: 'I03', label: 'ingest-demographics', script: 'scripts/ingest/03_ingest-demographics.ts' },
  // Compute IE N0-N4
  { id: 'C01', label: 'compute-n0', script: 'scripts/compute/01_compute-n0.ts' },
  { id: 'C02', label: 'compute-n1', script: 'scripts/compute/02_compute-n1.ts' },
  { id: 'C03', label: 'compute-n2', script: 'scripts/compute/03_compute-n2.ts' },
  { id: 'C04', label: 'compute-n3', script: 'scripts/compute/04_compute-n3.ts' },
  { id: 'C05', label: 'compute-n4', script: 'scripts/compute/05_compute-n4.ts' },
  // Compute DMX indices
  { id: 'C06', label: 'compute-dmx-indices', script: 'scripts/compute/06_compute-dmx-indices.ts' },
  // Compute pulse + DNA + forecasts
  { id: 'C07', label: 'compute-zone-pulse', script: 'scripts/compute/07_compute-zone-pulse.ts' },
  { id: 'C08', label: 'compute-colonia-dna', script: 'scripts/compute/08_compute-colonia-dna.ts' },
  {
    id: 'C09',
    label: 'compute-zone-pulse-forecasts',
    script: 'scripts/compute/09_compute-zone-pulse-forecasts.ts',
  },
  // Compute climate + constellations + ghost
  {
    id: 'C10',
    label: 'compute-climate-signatures',
    script: 'scripts/compute/10_compute-climate-signatures.ts',
  },
  {
    id: 'C11',
    label: 'compute-constellations-edges',
    script: 'scripts/compute/11_compute-constellations-edges.ts',
  },
  { id: 'C12', label: 'compute-ghost-zones', script: 'scripts/compute/12_compute-ghost-zones.ts' },
  // Compute atlas wiki (07.5.E)
  {
    id: 'C13',
    label: 'compute-atlas-wiki-haiku',
    script: 'scripts/compute/13_compute-atlas-wiki-haiku.ts',
  },
] as const;

const WIKI_STEP_ID = 'C13';
const LOADER_IMPORT = './scripts/compute/_register-ts-loader.mjs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CliArgs = {
  skip: string[];
  only: string | null;
  dryRun: boolean;
  costCapUsd: number | null;
  stopOnFail: boolean;
  help: boolean;
};

export type StepStatus = 'success' | 'failed' | 'skipped' | 'dry_run';

export type StepResult = {
  id: string;
  label: string;
  script: string;
  status: StepStatus;
  duration_ms: number;
  exit_code: number | null;
  skipped: boolean;
  cost_usd: number | null;
};

export type PipelineSummary = {
  pipeline: 'run-full-ingesta';
  started_at: string;
  completed_at: string;
  total_duration_ms: number;
  steps: StepResult[];
  aborted_at_step: string | null;
  total_cost_usd: number | null;
};

type StdStream = {
  on: (event: 'data', cb: (chunk: Buffer | string) => void) => void;
} | null;

export type SpawnedLike = {
  stdout: StdStream;
  stderr: StdStream;
  on: (event: 'close' | 'error', cb: (codeOrErr: number | Error | null) => void) => void;
};

export type SpawnLike = (
  command: string,
  args: readonly string[],
  options: { stdio?: 'pipe' | 'inherit'; env?: NodeJS.ProcessEnv },
) => SpawnedLike;

type Logger = {
  log: (line: string) => void;
  error: (line: string) => void;
};

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const SKIP_PREFIX = '--skip=';
const ONLY_PREFIX = '--only=';
const COST_CAP_PREFIX = '--cost-cap-usd=';
const STOP_ON_FAIL_FALSE = '--stop-on-fail=false';

export function parseCliArgs(argv: readonly string[]): CliArgs {
  let skip: string[] = [];
  let only: string | null = null;
  let dryRun = false;
  let costCapUsd: number | null = null;
  let stopOnFail = true;
  let help = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith(SKIP_PREFIX)) {
      skip = arg
        .slice(SKIP_PREFIX.length)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (arg.startsWith(ONLY_PREFIX)) {
      const val = arg.slice(ONLY_PREFIX.length).trim();
      only = val.length > 0 ? val : null;
    } else if (arg.startsWith(COST_CAP_PREFIX)) {
      const raw = arg.slice(COST_CAP_PREFIX.length);
      const n = Number.parseFloat(raw);
      if (Number.isFinite(n) && n > 0) {
        costCapUsd = n;
      }
    } else if (arg === STOP_ON_FAIL_FALSE) {
      stopOnFail = false;
    }
  }

  if (only != null && skip.length > 0) {
    throw new Error('--only and --skip are mutually exclusive');
  }

  const knownIds = new Set(PIPELINE_STEPS.map((s) => s.id));
  if (only != null && !knownIds.has(only)) {
    throw new Error(`--only references unknown step id: ${only}`);
  }
  for (const id of skip) {
    if (!knownIds.has(id)) {
      throw new Error(`--skip references unknown step id: ${id}`);
    }
  }

  return { skip, only, dryRun, costCapUsd, stopOnFail, help };
}

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export function buildHelpText(): string {
  const lines: string[] = [];
  lines.push('run-full-ingesta — orquestrador foundational IE + DMX');
  lines.push('');
  lines.push('Pipeline topológica (orden de ejecución):');
  for (const step of PIPELINE_STEPS) {
    lines.push(`  ${step.id}  ${step.label.padEnd(32)} ${step.script}`);
  }
  lines.push('');
  lines.push('Flags:');
  lines.push('  --skip=IDs            Skip steps (coma-sep, ej: --skip=C13,C10)');
  lines.push('  --only=ID             Ejecuta solo un step (ej: --only=C13).');
  lines.push('  --dry-run             Propaga --dry-run a todos los scripts hijo.');
  lines.push('  --cost-cap-usd=N      Propaga --cost-cap-usd=N solo al step C13.');
  lines.push('  --stop-on-fail=false  No abortar al primer fail (default true).');
  lines.push('  --help | -h           Imprime esta ayuda y exit(0).');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Child flags builder
// ---------------------------------------------------------------------------

export function buildChildFlags(step: PipelineStep, args: CliArgs): string[] {
  const flags: string[] = [];
  if (args.dryRun) {
    flags.push('--dry-run');
  }
  if (args.costCapUsd != null && step.id === WIKI_STEP_ID) {
    flags.push(`--cost-cap-usd=${args.costCapUsd}`);
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Spawn node args builder
// ---------------------------------------------------------------------------

export function buildNodeArgs(step: PipelineStep, childFlags: readonly string[]): string[] {
  return [
    '--experimental-strip-types',
    '--experimental-transform-types',
    `--import=${LOADER_IMPORT}`,
    step.script,
    ...childFlags,
  ];
}

// ---------------------------------------------------------------------------
// Run step
// ---------------------------------------------------------------------------

function stepBase(step: PipelineStep): Pick<StepResult, 'id' | 'label' | 'script'> {
  return { id: step.id, label: step.label, script: step.script };
}

function defaultLogger(): Logger {
  return {
    log: (line) => {
      console.log(line);
    },
    error: (line) => {
      console.error(line);
    },
  };
}

function formatChunkLines(chunk: Buffer | string): string[] {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  return text.split('\n').filter((line) => line.length > 0);
}

export async function runStep(
  step: PipelineStep,
  args: CliArgs,
  spawnFn: SpawnLike = spawn as unknown as SpawnLike,
  logger: Logger = defaultLogger(),
): Promise<StepResult> {
  const childFlags = buildChildFlags(step, args);
  const nodeArgs = buildNodeArgs(step, childFlags);
  const prefix = `[orchestrator][${step.id}]`;
  const startMs = Date.now();

  logger.log(`${prefix} starting ${step.label} (flags=${JSON.stringify(childFlags)})`);

  return new Promise<StepResult>((resolve) => {
    let child: SpawnedLike;
    try {
      child = spawnFn('node', nodeArgs, { stdio: 'pipe', env: process.env });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`${prefix} spawn error: ${msg}`);
      resolve({
        ...stepBase(step),
        status: 'failed',
        duration_ms: Date.now() - startMs,
        exit_code: null,
        skipped: false,
        cost_usd: null,
      });
      return;
    }

    if (child.stdout != null) {
      child.stdout.on('data', (chunk) => {
        for (const line of formatChunkLines(chunk)) {
          logger.log(`${prefix} ${line}`);
        }
      });
    }
    if (child.stderr != null) {
      child.stderr.on('data', (chunk) => {
        for (const line of formatChunkLines(chunk)) {
          logger.error(`${prefix} ${line}`);
        }
      });
    }

    let settled = false;

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`${prefix} process error: ${msg}`);
      resolve({
        ...stepBase(step),
        status: 'failed',
        duration_ms: Date.now() - startMs,
        exit_code: null,
        skipped: false,
        cost_usd: null,
      });
    });

    child.on('close', (codeOrErr) => {
      if (settled) return;
      settled = true;
      const exitCode = typeof codeOrErr === 'number' ? codeOrErr : null;
      const duration = Date.now() - startMs;
      const ok = exitCode === 0;
      const status: StepStatus = ok ? (args.dryRun ? 'dry_run' : 'success') : 'failed';
      logger.log(
        `${prefix} finished status=${status} exit_code=${exitCode} duration_ms=${duration}`,
      );
      resolve({
        ...stepBase(step),
        status,
        duration_ms: duration,
        exit_code: exitCode,
        skipped: false,
        cost_usd: null,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Pipeline runner
// ---------------------------------------------------------------------------

export async function runPipeline(
  args: CliArgs,
  spawnFn: SpawnLike = spawn as unknown as SpawnLike,
  logger: Logger = defaultLogger(),
): Promise<PipelineSummary> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const results: StepResult[] = [];
  let aborted: string | null = null;

  const effectiveSteps =
    args.only != null
      ? PIPELINE_STEPS.filter((s) => s.id === args.only)
      : PIPELINE_STEPS.filter((s) => !args.skip.includes(s.id));

  for (const step of PIPELINE_STEPS) {
    const included = effectiveSteps.some((s) => s.id === step.id);
    if (!included) {
      logger.log(`[orchestrator][${step.id}] skipped (filter)`);
      results.push({
        ...stepBase(step),
        status: 'skipped',
        duration_ms: 0,
        exit_code: null,
        skipped: true,
        cost_usd: null,
      });
      continue;
    }
    if (aborted != null) {
      logger.log(`[orchestrator][${step.id}] skipped (aborted after ${aborted})`);
      results.push({
        ...stepBase(step),
        status: 'skipped',
        duration_ms: 0,
        exit_code: null,
        skipped: true,
        cost_usd: null,
      });
      continue;
    }
    const stepResult = await runStep(step, args, spawnFn, logger);
    results.push(stepResult);
    if (stepResult.status === 'failed' && args.stopOnFail) {
      aborted = step.id;
    }
  }

  const summary: PipelineSummary = {
    pipeline: 'run-full-ingesta',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    total_duration_ms: Date.now() - startMs,
    steps: results,
    aborted_at_step: aborted,
    total_cost_usd: null,
  };
  return summary;
}

// ---------------------------------------------------------------------------
// Summary JSON builder (pure — helps tests)
// ---------------------------------------------------------------------------

export function buildSummaryJson(summary: PipelineSummary): string {
  return JSON.stringify(summary, null, 2);
}

// ---------------------------------------------------------------------------
// Main invocation guard
// ---------------------------------------------------------------------------

const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedAsScript) {
  try {
    const args = parseCliArgs(process.argv.slice(2));
    if (args.help) {
      console.log(buildHelpText());
      process.exit(0);
    }
    runPipeline(args)
      .then((summary) => {
        console.log(buildSummaryJson(summary));
        process.exit(summary.aborted_at_step != null ? 1 : 0);
      })
      .catch((err) => {
        console.error('[orchestrator] FATAL:', err);
        process.exit(1);
      });
  } catch (err) {
    console.error('[orchestrator] FATAL:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
