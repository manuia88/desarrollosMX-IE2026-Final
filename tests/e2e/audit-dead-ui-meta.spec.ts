import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// Workflow validation — corre siempre, sin browser, sin webServer.
// Garantiza ADR-018 enforcer health: zero violations net + baseline 25 + workflow CI gate.

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE_PATH = resolve(REPO_ROOT, 'scripts', 'audit-dead-ui-baseline.json');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github', 'workflows', 'e2e-audit.yml');
const EXPECTED_BASELINE_COUNT = 25;

test.describe('audit-dead-ui meta · ADR-018 enforcer health', () => {
  test('audit:dead-ui:ci report has zero violations net of baseline', async () => {
    test.setTimeout(120_000);
    let stdout = '';
    try {
      stdout = execSync('npm run --silent audit:dead-ui:ci', {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        env: { ...process.env, CI: '1' },
      });
    } catch (err: unknown) {
      const e = err as { stdout?: string };
      stdout = e.stdout ?? '';
    }
    const report = JSON.parse(stdout) as unknown;
    expect(Array.isArray(report)).toBe(true);
    expect((report as unknown[]).length).toBe(0);
  });

  test('baseline file exists and contains exactly 25 allowlisted entries', async () => {
    expect(existsSync(BASELINE_PATH)).toBe(true);
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8')) as {
      allowlist: Array<{ file: string; line: number; pattern: string }>;
    };
    expect(Array.isArray(baseline.allowlist)).toBe(true);
    expect(baseline.allowlist.length).toBe(EXPECTED_BASELINE_COUNT);
    for (const entry of baseline.allowlist) {
      expect(typeof entry.file).toBe('string');
      expect(entry.file.length).toBeGreaterThan(0);
      expect(typeof entry.line).toBe('number');
      expect(typeof entry.pattern).toBe('string');
      expect(entry.pattern.length).toBeGreaterThan(0);
    }
  });

  test('GitHub Actions workflow e2e-audit.yml gates on PR + push to main', async () => {
    expect(existsSync(WORKFLOW_PATH)).toBe(true);
    const yml = readFileSync(WORKFLOW_PATH, 'utf-8');
    expect(yml).toMatch(/audit:dead-ui:ci/);
    expect(yml).toMatch(/pull_request/);
    expect(yml).toMatch(/branches:\s*\[main\]/);
  });
});
