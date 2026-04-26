import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error — .mjs script, parseAndWalk exported via guard.
import { parseAndWalk } from '../audit-dead-ui.mjs';

const execFileP = promisify(execFile);
const FIXTURE_DIR = resolve(process.cwd(), 'tmp/audit-test-fixtures');
const SCRIPT = resolve(process.cwd(), 'scripts/audit-dead-ui.mjs');

type Violation = {
  file: string;
  line: number;
  column: number;
  pattern: string;
  message: string;
  severity: 'error' | 'warn';
};

beforeAll(async () => {
  await mkdir(FIXTURE_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(FIXTURE_DIR, { recursive: true, force: true });
});

function audit(code: string, kind: 'tsx' | 'router' = 'tsx', file = 'inline.tsx'): Violation[] {
  const violations: Violation[] = [];
  parseAndWalk(code, file, violations, kind);
  return violations;
}

describe('audit-dead-ui R1 button_no_handler', () => {
  it('flagea Button sin onClick', () => {
    const v = audit('export const X = () => <Button>Save</Button>;');
    expect(v.find((x) => x.pattern === 'button_no_handler')).toBeDefined();
  });

  it('OK con onClick', () => {
    const v = audit('export const X = () => <Button onClick={fn}>Save</Button>;');
    expect(v.find((x) => x.pattern === 'button_no_handler')).toBeUndefined();
  });

  it('OK con disabled', () => {
    const v = audit('export const X = () => <Button disabled>Save</Button>;');
    expect(v.find((x) => x.pattern === 'button_no_handler')).toBeUndefined();
  });

  it('OK con href (link-as-button)', () => {
    const v = audit('export const X = () => <Button href="/x">Go</Button>;');
    expect(v.find((x) => x.pattern === 'button_no_handler')).toBeUndefined();
  });

  it('OK con type="submit"', () => {
    const v = audit('export const X = () => <Button type="submit">Send</Button>;');
    expect(v.find((x) => x.pattern === 'button_no_handler')).toBeUndefined();
  });

  it('OK con asChild (Radix slot)', () => {
    const v = audit('export const X = () => <Button asChild><Link href="/x">Go</Link></Button>;');
    expect(v.find((x) => x.pattern === 'button_no_handler')).toBeUndefined();
  });
});

describe('audit-dead-ui R2 form_no_onsubmit', () => {
  it('flagea form sin onSubmit ni action', () => {
    const v = audit('export const X = () => <form><input /></form>;');
    expect(v.find((x) => x.pattern === 'form_no_onsubmit')).toBeDefined();
  });

  it('OK con onSubmit', () => {
    const v = audit('export const X = () => <form onSubmit={h}><input /></form>;');
    expect(v.find((x) => x.pattern === 'form_no_onsubmit')).toBeUndefined();
  });

  it('OK con action (Server Action)', () => {
    const v = audit('export const X = () => <form action={createTodo}><input /></form>;');
    expect(v.find((x) => x.pattern === 'form_no_onsubmit')).toBeUndefined();
  });
});

describe('audit-dead-ui R3 placeholder handlers', () => {
  it('flagea onClick={() => {}} (empty arrow)', () => {
    const v = audit('export const X = () => <div onClick={() => {}}>x</div>;');
    expect(v.find((x) => x.pattern === 'empty_handler')).toBeDefined();
  });

  it('flagea onClick={() => alert("TODO")}', () => {
    const v = audit('export const X = () => <div onClick={() => alert("TODO")}>x</div>;');
    expect(v.find((x) => x.pattern === 'placeholder_handler')).toBeDefined();
  });

  it('flagea onClick={() => console.log("x")}', () => {
    const v = audit('export const X = () => <div onClick={() => console.log("x")}>x</div>;');
    expect(v.find((x) => x.pattern === 'placeholder_handler')).toBeDefined();
  });

  it('OK con handler real onClick={handleSave}', () => {
    const v = audit('export const X = () => <div onClick={handleSave}>x</div>;');
    expect(v.find((x) => x.pattern.endsWith('_handler'))).toBeUndefined();
  });
});

describe('audit-dead-ui R4 dead_href', () => {
  it('flagea href="#"', () => {
    const v = audit('export const X = () => <a href="#">click</a>;');
    expect(v.find((x) => x.pattern === 'dead_href')).toBeDefined();
  });

  it('flagea href=""', () => {
    const v = audit('export const X = () => <Link href="">click</Link>;');
    expect(v.find((x) => x.pattern === 'dead_href')).toBeDefined();
  });

  it('OK con ruta válida', () => {
    const v = audit('export const X = () => <Link href="/dashboard">click</Link>;');
    expect(v.find((x) => x.pattern === 'dead_href')).toBeUndefined();
  });
});

describe('audit-dead-ui R5 useeffect_no_deps', () => {
  it('warnea useEffect sin deps array', () => {
    const v = audit('export const X = () => { useEffect(() => { fetch("/x") }); return null; };');
    const hit = v.find((x) => x.pattern === 'useeffect_no_deps');
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('warn');
  });

  it('OK useEffect con deps', () => {
    const v = audit(
      'export const X = () => { useEffect(() => { fetch("/x") }, [id]); return null; };',
    );
    expect(v.find((x) => x.pattern === 'useeffect_no_deps')).toBeUndefined();
  });
});

describe('audit-dead-ui R6 unmarked_stub_error (router files)', () => {
  it('flagea throw new Error genérico sin marcador STUB', () => {
    const code = `
      export const r = procedure.query(async () => {
        throw new Error("TODO");
      });
    `;
    const v = audit(code, 'router', 'router.ts');
    expect(v.find((x) => x.pattern === 'unmarked_stub_error')).toBeDefined();
  });

  it('OK con // STUB — activar marker', () => {
    const code = `
      // STUB — activar FASE 31 con [Agent Marketplace]
      export const r = procedure.query(async () => {
        throw new Error("TODO");
      });
    `;
    const v = audit(code, 'router', 'router.ts');
    expect(v.find((x) => x.pattern === 'unmarked_stub_error')).toBeUndefined();
  });

  it('OK con throw new Error de validación (whitelist keyword)', () => {
    const code = `
      export const r = procedure.query(async () => {
        throw new Error("missing required env DATABASE_URL");
      });
    `;
    const v = audit(code, 'router', 'router.ts');
    expect(v.find((x) => x.pattern === 'unmarked_stub_error')).toBeUndefined();
  });
});

describe('audit-dead-ui CLI integration', () => {
  it('--ci con violations sale con exit code 1', async () => {
    const subdir = join(FIXTURE_DIR, 'features/x/components');
    await mkdir(subdir, { recursive: true });
    await writeFile(join(subdir, 'bad.tsx'), 'export const X = () => <Button>save</Button>;');
    await expect(execFileP('node', [SCRIPT, '--ci'], { cwd: FIXTURE_DIR })).rejects.toMatchObject({
      code: 1,
    });
  });

  it('--json produce JSON válido en stdout', async () => {
    const result = await execFileP('node', [SCRIPT, '--json'], { cwd: FIXTURE_DIR }).catch(
      (e: { stdout: string }) => e,
    );
    const stdout = (result as { stdout: string }).stdout;
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  it('sin violations sale con exit code 0', async () => {
    await rm(join(FIXTURE_DIR, 'features'), { recursive: true, force: true });
    const subdir = join(FIXTURE_DIR, 'features/x/components');
    await mkdir(subdir, { recursive: true });
    await writeFile(
      join(subdir, 'ok.tsx'),
      'export const X = () => <Button onClick={fn}>save</Button>;',
    );
    const { stdout } = await execFileP('node', [SCRIPT, '--json'], { cwd: FIXTURE_DIR });
    const violations = JSON.parse(stdout) as Violation[];
    expect(violations.filter((v) => v.severity === 'error')).toHaveLength(0);
  });
});
