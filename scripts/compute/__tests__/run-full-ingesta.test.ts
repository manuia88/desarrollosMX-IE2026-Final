import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildChildFlags,
  buildHelpText,
  buildNodeArgs,
  buildSummaryJson,
  type CliArgs,
  PIPELINE_STEPS,
  type PipelineStep,
  type PipelineSummary,
  parseCliArgs,
  runPipeline,
  runStep,
  type SpawnedLike,
  type SpawnLike,
  type StepResult,
} from '../run-full-ingesta.ts';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type StubEvents = {
  stdoutData: Array<Buffer | string>;
  stderrData: Array<Buffer | string>;
  closeCode: number | null;
  error: Error | null;
  throwOnSpawn: boolean;
};

type StubInvocation = {
  command: string;
  args: readonly string[];
};

type CaptureHandlers = {
  stdout: Array<(chunk: Buffer | string) => void>;
  stderr: Array<(chunk: Buffer | string) => void>;
  close: Array<(code: number | null) => void>;
  errorCb: Array<(err: Error | null) => void>;
};

type StepScenario = Partial<StubEvents>;

type CreateStubOptions = {
  perStep?: Record<string, StepScenario>;
  invocations?: StubInvocation[];
};

function makeSpawnStub(opts: CreateStubOptions = {}): {
  spawn: SpawnLike;
  invocations: StubInvocation[];
} {
  const invocations = opts.invocations ?? [];
  const spawn: SpawnLike = (command, args) => {
    invocations.push({ command, args: [...args] });

    const scriptArg = args.find((a) => a.startsWith('scripts/'));
    const stepId =
      scriptArg != null
        ? (PIPELINE_STEPS.find((s) => s.script === scriptArg)?.id ?? '_unknown')
        : '_unknown';
    const scenario: StepScenario = opts.perStep?.[stepId] ?? {};

    const events: StubEvents = {
      stdoutData: scenario.stdoutData ?? [],
      stderrData: scenario.stderrData ?? [],
      closeCode: scenario.closeCode ?? 0,
      error: scenario.error ?? null,
      throwOnSpawn: scenario.throwOnSpawn ?? false,
    };

    if (events.throwOnSpawn) {
      throw new Error('spawn: ENOENT');
    }

    const handlers: CaptureHandlers = {
      stdout: [],
      stderr: [],
      close: [],
      errorCb: [],
    };

    const spawned: SpawnedLike = {
      stdout: {
        on: (_event, cb) => {
          handlers.stdout.push(cb);
        },
      },
      stderr: {
        on: (_event, cb) => {
          handlers.stderr.push(cb);
        },
      },
      on: (event, cb) => {
        if (event === 'close') {
          handlers.close.push(cb as (code: number | null) => void);
        } else if (event === 'error') {
          handlers.errorCb.push(cb as (err: Error | null) => void);
        }
      },
    };

    // Drain events asynchronously so listeners are attached first.
    queueMicrotask(() => {
      for (const chunk of events.stdoutData) {
        for (const h of handlers.stdout) h(chunk);
      }
      for (const chunk of events.stderrData) {
        for (const h of handlers.stderr) h(chunk);
      }
      if (events.error != null) {
        for (const h of handlers.errorCb) h(events.error);
        return;
      }
      for (const h of handlers.close) h(events.closeCode);
    });

    return spawned;
  };

  return { spawn, invocations };
}

function defaultArgs(overrides: Partial<CliArgs> = {}): CliArgs {
  return {
    skip: [],
    only: null,
    dryRun: false,
    costCapUsd: null,
    stopOnFail: true,
    help: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------
// parseCliArgs
// ---------------------------------------------------------------------------

describe('parseCliArgs', () => {
  it('parses --skip single id', () => {
    const out = parseCliArgs(['--skip=C13']);
    expect(out.skip).toEqual(['C13']);
    expect(out.only).toBeNull();
  });

  it('parses --skip multiple ids trimmed', () => {
    const out = parseCliArgs(['--skip=C13, C10 ,I02']);
    expect(out.skip).toEqual(['C13', 'C10', 'I02']);
  });

  it('parses --only', () => {
    const out = parseCliArgs(['--only=C13']);
    expect(out.only).toBe('C13');
    expect(out.skip).toEqual([]);
  });

  it('parses --dry-run', () => {
    const out = parseCliArgs(['--dry-run']);
    expect(out.dryRun).toBe(true);
  });

  it('parses --cost-cap-usd', () => {
    const out = parseCliArgs(['--cost-cap-usd=1.5']);
    expect(out.costCapUsd).toBe(1.5);
  });

  it('ignores invalid cost-cap (NaN)', () => {
    const out = parseCliArgs(['--cost-cap-usd=notanumber']);
    expect(out.costCapUsd).toBeNull();
  });

  it('ignores zero/negative cost-cap', () => {
    const out = parseCliArgs(['--cost-cap-usd=0']);
    expect(out.costCapUsd).toBeNull();
    const out2 = parseCliArgs(['--cost-cap-usd=-1']);
    expect(out2.costCapUsd).toBeNull();
  });

  it('parses --stop-on-fail=false', () => {
    const out = parseCliArgs(['--stop-on-fail=false']);
    expect(out.stopOnFail).toBe(false);
  });

  it('defaults stopOnFail to true', () => {
    const out = parseCliArgs([]);
    expect(out.stopOnFail).toBe(true);
  });

  it('parses --help and -h', () => {
    expect(parseCliArgs(['--help']).help).toBe(true);
    expect(parseCliArgs(['-h']).help).toBe(true);
  });

  it('throws when --only and --skip combined', () => {
    expect(() => parseCliArgs(['--only=C13', '--skip=C10'])).toThrow(/mutually exclusive/);
  });

  it('throws on unknown --only id', () => {
    expect(() => parseCliArgs(['--only=ZZZ'])).toThrow(/unknown step id/);
  });

  it('throws on unknown --skip id', () => {
    expect(() => parseCliArgs(['--skip=ZZZ'])).toThrow(/unknown step id/);
  });
});

// ---------------------------------------------------------------------------
// PIPELINE_STEPS topology
// ---------------------------------------------------------------------------

describe('PIPELINE_STEPS', () => {
  it('has 16 steps in expected topological order', () => {
    const ids = PIPELINE_STEPS.map((s) => s.id);
    expect(ids).toEqual([
      'I01',
      'I02',
      'I03',
      'C01',
      'C02',
      'C03',
      'C04',
      'C05',
      'C06',
      'C07',
      'C08',
      'C09',
      'C10',
      'C11',
      'C12',
      'C13',
    ]);
    expect(PIPELINE_STEPS.length).toBe(16);
  });

  it('each step has unique id', () => {
    const ids = PIPELINE_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all scripts point to scripts/ingest or scripts/compute', () => {
    for (const step of PIPELINE_STEPS) {
      expect(step.script.startsWith('scripts/')).toBe(true);
      expect(step.script.endsWith('.ts')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// buildChildFlags
// ---------------------------------------------------------------------------

describe('buildChildFlags', () => {
  const c13: PipelineStep = PIPELINE_STEPS.find((s) => s.id === 'C13') as PipelineStep;
  const c10: PipelineStep = PIPELINE_STEPS.find((s) => s.id === 'C10') as PipelineStep;

  it('returns empty when no flags', () => {
    expect(buildChildFlags(c10, defaultArgs())).toEqual([]);
  });

  it('propagates --dry-run only', () => {
    expect(buildChildFlags(c10, defaultArgs({ dryRun: true }))).toEqual(['--dry-run']);
  });

  it('propagates --cost-cap-usd only to C13', () => {
    expect(buildChildFlags(c10, defaultArgs({ costCapUsd: 2 }))).toEqual([]);
    expect(buildChildFlags(c13, defaultArgs({ costCapUsd: 2 }))).toEqual(['--cost-cap-usd=2']);
  });

  it('combines dry-run + cost-cap for C13', () => {
    const flags = buildChildFlags(c13, defaultArgs({ dryRun: true, costCapUsd: 0.5 }));
    expect(flags).toEqual(['--dry-run', '--cost-cap-usd=0.5']);
  });
});

// ---------------------------------------------------------------------------
// buildNodeArgs
// ---------------------------------------------------------------------------

describe('buildNodeArgs', () => {
  it('includes strip-types + loader + script path', () => {
    const step = PIPELINE_STEPS[0] as PipelineStep;
    const args = buildNodeArgs(step, []);
    expect(args[0]).toBe('--experimental-strip-types');
    expect(args[1]).toBe('--experimental-transform-types');
    expect(args[2]).toMatch(/^--import=\.\/scripts\/compute\/_register-ts-loader\.mjs$/);
    expect(args[3]).toBe(step.script);
  });

  it('appends child flags after script', () => {
    const step = PIPELINE_STEPS[0] as PipelineStep;
    const args = buildNodeArgs(step, ['--dry-run']);
    expect(args[args.length - 1]).toBe('--dry-run');
  });
});

// ---------------------------------------------------------------------------
// runStep with mocked spawn
// ---------------------------------------------------------------------------

describe('runStep', () => {
  const step = PIPELINE_STEPS.find((s) => s.id === 'C13') as PipelineStep;

  it('resolves success on exit 0', async () => {
    const { spawn } = makeSpawnStub({ perStep: { C13: { closeCode: 0 } } });
    const result = await runStep(step, defaultArgs(), spawn);
    expect(result.status).toBe('success');
    expect(result.exit_code).toBe(0);
    expect(result.skipped).toBe(false);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('resolves failed on exit 1', async () => {
    const { spawn } = makeSpawnStub({ perStep: { C13: { closeCode: 1 } } });
    const result = await runStep(step, defaultArgs(), spawn);
    expect(result.status).toBe('failed');
    expect(result.exit_code).toBe(1);
  });

  it('marks status dry_run when --dry-run and exit 0', async () => {
    const { spawn, invocations } = makeSpawnStub({ perStep: { C13: { closeCode: 0 } } });
    const result = await runStep(step, defaultArgs({ dryRun: true }), spawn);
    expect(result.status).toBe('dry_run');
    const inv = invocations[0];
    expect(inv).toBeDefined();
    expect(inv?.args).toContain('--dry-run');
  });

  it('propagates --cost-cap-usd only for C13', async () => {
    const { spawn, invocations } = makeSpawnStub({ perStep: { C13: { closeCode: 0 } } });
    await runStep(step, defaultArgs({ costCapUsd: 0.75 }), spawn);
    const inv = invocations[0];
    expect(inv?.args).toContain('--cost-cap-usd=0.75');
  });

  it('captures stdout and stderr lines via logger', async () => {
    const logged: string[] = [];
    const errored: string[] = [];
    const { spawn } = makeSpawnStub({
      perStep: {
        C13: {
          stdoutData: ['hello world\n'],
          stderrData: ['oh no\n'],
          closeCode: 0,
        },
      },
    });
    await runStep(step, defaultArgs(), spawn, {
      log: (line) => logged.push(line),
      error: (line) => errored.push(line),
    });
    expect(logged.some((l) => l.includes('[orchestrator][C13]') && l.includes('hello world'))).toBe(
      true,
    );
    expect(errored.some((l) => l.includes('[orchestrator][C13]') && l.includes('oh no'))).toBe(
      true,
    );
  });

  it('marks failed when spawn throws', async () => {
    const { spawn } = makeSpawnStub({ perStep: { C13: { throwOnSpawn: true } } });
    const result = await runStep(step, defaultArgs(), spawn);
    expect(result.status).toBe('failed');
    expect(result.exit_code).toBeNull();
  });

  it('marks failed on child error event', async () => {
    const { spawn } = makeSpawnStub({
      perStep: { C13: { error: new Error('boom') } },
    });
    const result = await runStep(step, defaultArgs(), spawn);
    expect(result.status).toBe('failed');
    expect(result.exit_code).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// runPipeline happy + failure paths
// ---------------------------------------------------------------------------

describe('runPipeline', () => {
  it('runs all steps success when none fail', async () => {
    const { spawn, invocations } = makeSpawnStub();
    const summary = await runPipeline(defaultArgs(), spawn);
    expect(summary.steps.length).toBe(PIPELINE_STEPS.length);
    expect(summary.steps.every((s) => s.status === 'success')).toBe(true);
    expect(summary.aborted_at_step).toBeNull();
    expect(invocations.length).toBe(PIPELINE_STEPS.length);
  });

  it('aborts remaining steps when one fails and stopOnFail=true', async () => {
    const { spawn, invocations } = makeSpawnStub({
      perStep: { C05: { closeCode: 1 } },
    });
    const summary = await runPipeline(defaultArgs({ stopOnFail: true }), spawn);
    const c05 = summary.steps.find((s) => s.id === 'C05');
    expect(c05?.status).toBe('failed');
    expect(summary.aborted_at_step).toBe('C05');
    const afterFail = summary.steps.slice(summary.steps.findIndex((s) => s.id === 'C05') + 1);
    for (const s of afterFail) {
      expect(s.status).toBe('skipped');
      expect(s.skipped).toBe(true);
    }
    // Only invocations up to C05
    expect(invocations.length).toBe(8);
  });

  it('continues on failure when stopOnFail=false', async () => {
    const { spawn, invocations } = makeSpawnStub({
      perStep: { C05: { closeCode: 1 } },
    });
    const summary = await runPipeline(defaultArgs({ stopOnFail: false }), spawn);
    expect(summary.aborted_at_step).toBeNull();
    const c13 = summary.steps.find((s) => s.id === 'C13');
    expect(c13?.status).toBe('success');
    expect(invocations.length).toBe(PIPELINE_STEPS.length);
  });

  it('--only runs only target step; others marked skipped', async () => {
    const { spawn, invocations } = makeSpawnStub();
    const summary = await runPipeline(defaultArgs({ only: 'C13' }), spawn);
    const executedIds = summary.steps.filter((s) => !s.skipped).map((s) => s.id);
    expect(executedIds).toEqual(['C13']);
    const skippedIds = summary.steps.filter((s) => s.skipped).map((s) => s.id);
    expect(skippedIds.length).toBe(PIPELINE_STEPS.length - 1);
    expect(invocations.length).toBe(1);
    expect(invocations[0]?.args.some((a) => a.endsWith('13_compute-atlas-wiki-haiku.ts'))).toBe(
      true,
    );
  });

  it('--skip prevents spawn of skipped steps', async () => {
    const { spawn, invocations } = makeSpawnStub();
    const summary = await runPipeline(defaultArgs({ skip: ['C13', 'C10'] }), spawn);
    const c13 = summary.steps.find((s) => s.id === 'C13');
    const c10 = summary.steps.find((s) => s.id === 'C10');
    expect(c13?.status).toBe('skipped');
    expect(c10?.status).toBe('skipped');
    const spawnedScripts = invocations
      .map((i) => i.args.find((a) => a.startsWith('scripts/')))
      .filter((v): v is string => typeof v === 'string');
    expect(spawnedScripts.some((s) => s.includes('13_compute-atlas-wiki-haiku'))).toBe(false);
    expect(spawnedScripts.some((s) => s.includes('10_compute-climate-signatures'))).toBe(false);
    expect(invocations.length).toBe(PIPELINE_STEPS.length - 2);
  });

  it('propagates dry-run to all executed steps', async () => {
    const { spawn, invocations } = makeSpawnStub();
    const summary = await runPipeline(defaultArgs({ dryRun: true }), spawn);
    for (const inv of invocations) {
      expect(inv.args).toContain('--dry-run');
    }
    expect(summary.steps.every((s) => s.status === 'dry_run')).toBe(true);
  });

  it('propagates cost-cap only to C13 invocation', async () => {
    const { spawn, invocations } = makeSpawnStub();
    await runPipeline(defaultArgs({ costCapUsd: 1.25 }), spawn);
    for (const inv of invocations) {
      const script = inv.args.find((a) => a.startsWith('scripts/')) ?? '';
      const hasCostCap = inv.args.some((a) => a.startsWith('--cost-cap-usd='));
      if (script.includes('13_compute-atlas-wiki-haiku')) {
        expect(hasCostCap).toBe(true);
      } else {
        expect(hasCostCap).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// buildSummaryJson shape
// ---------------------------------------------------------------------------

describe('buildSummaryJson', () => {
  it('emits expected top-level keys', () => {
    const fakeResult: StepResult = {
      id: 'I01',
      label: 'ingest-geo-boundaries',
      script: 'scripts/ingest/01_ingest-geo-boundaries.ts',
      status: 'success',
      duration_ms: 123,
      exit_code: 0,
      skipped: false,
      cost_usd: null,
    };
    const summary: PipelineSummary = {
      pipeline: 'run-full-ingesta',
      started_at: '2026-04-24T00:00:00.000Z',
      completed_at: '2026-04-24T00:00:05.000Z',
      total_duration_ms: 5000,
      steps: [fakeResult],
      aborted_at_step: null,
      total_cost_usd: null,
    };
    const parsed = JSON.parse(buildSummaryJson(summary)) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(
      [
        'aborted_at_step',
        'completed_at',
        'pipeline',
        'started_at',
        'steps',
        'total_cost_usd',
        'total_duration_ms',
      ].sort(),
    );
    expect(parsed.pipeline).toBe('run-full-ingesta');
  });
});

// ---------------------------------------------------------------------------
// buildHelpText
// ---------------------------------------------------------------------------

describe('buildHelpText', () => {
  it('lists all step ids and flag names', () => {
    const txt = buildHelpText();
    for (const step of PIPELINE_STEPS) {
      expect(txt).toContain(step.id);
    }
    expect(txt).toContain('--skip=');
    expect(txt).toContain('--only=');
    expect(txt).toContain('--dry-run');
    expect(txt).toContain('--cost-cap-usd=');
    expect(txt).toContain('--stop-on-fail=false');
  });
});
