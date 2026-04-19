#!/usr/bin/env node
// @ts-check
// Enforcement de ADR-018 (E2E Connectedness). Detecta UI desconectada:
// botones sin handler, forms sin onSubmit, links muertos, handlers placeholder,
// stubs sin marcar. Aplica desde FASE 07 según docs/01_DECISIONES_ARQUITECTONICAS/ADR-018.
//
// Uso:
//   node scripts/audit-dead-ui.mjs           → output legible
//   node scripts/audit-dead-ui.mjs --ci      → exit code estricto + JSON a stdout si --json
//   node scripts/audit-dead-ui.mjs --json    → JSON a stdout
//
// Exit codes: 0 = no errors, 1 = errors detectados.

import { parse } from '@typescript-eslint/parser';
import { visitorKeys as tsVisitorKeys } from '@typescript-eslint/visitor-keys';
import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pc from 'picocolors';

const ROOT = resolve(process.cwd());
const GLOB_TSX = [
  'features/**/*.tsx',
  'app/**/*.tsx',
  '!**/node_modules/**',
  '!**/*.stories.tsx',
  '!**/*.test.tsx',
  '!**/*.spec.tsx',
  // Showcases internos del Design System en route group (dev) — no user-facing.
  // Los paréntesis se escapan por la sintaxis glob de fast-glob/picomatch.
  '!app/\\(dev\\)/**',
];
const GLOB_TS_ROUTERS = [
  'server/trpc/routers/**/*.ts',
  'features/**/routes/**/*.ts',
  // shared adapters (payments, fiscal, ai, etc): patrones provider/adapter cuyo
  // unimplemented suele ser stub por fase futura.
  'shared/lib/**/*.ts',
  '!**/node_modules/**',
  '!**/*.test.ts',
  '!**/*.spec.ts',
];

const isCi = process.argv.includes('--ci');
const asJson = process.argv.includes('--json') || isCi;

const STUB_COMMENT_RE = /\/\/\s*STUB\s*[—-]\s*(activar|disponible)/i;

/** @typedef {{file:string,line:number,column:number,pattern:string,message:string,severity:'error'|'warn'}} Violation */

async function main() {
  /** @type {Violation[]} */
  const violations = [];

  const tsxFiles = await fg(GLOB_TSX, { cwd: ROOT, absolute: true });
  for (const file of tsxFiles) {
    const code = await readFile(file, 'utf-8');
    parseAndWalk(code, file, violations, 'tsx');
  }

  const routerFiles = await fg(GLOB_TS_ROUTERS, { cwd: ROOT, absolute: true });
  for (const file of routerFiles) {
    const code = await readFile(file, 'utf-8');
    parseAndWalk(code, file, violations, 'router');
  }

  output(violations);
  const hasError = violations.some((v) => v.severity === 'error');
  process.exit(hasError ? 1 : 0);
}

/**
 * @param {string} code
 * @param {string} file
 * @param {Violation[]} violations
 * @param {'tsx'|'router'} kind
 */
function parseAndWalk(code, file, violations, kind) {
  let ast;
  try {
    ast = parse(code, {
      jsx: kind === 'tsx',
      loc: true,
      range: true,
      ecmaVersion: 2024,
      sourceType: 'module',
      comment: true,
    });
  } catch (err) {
    violations.push({
      file: relative(file),
      line: 0,
      column: 0,
      pattern: 'parse_error',
      message: `Failed to parse: ${/** @type {Error} */ (err).message}`,
      severity: 'error',
    });
    return;
  }
  walk(ast, file, code, violations, kind);
}

/**
 * @param {any} node
 * @param {string} file
 * @param {string} code
 * @param {Violation[]} violations
 * @param {'tsx'|'router'} kind
 */
function walk(node, file, code, violations, kind) {
  if (!node || typeof node !== 'object') return;
  if (kind === 'tsx') checkTsxNode(node, file, violations);
  if (kind === 'router') checkRouterNode(node, file, code, violations);
  const keys = tsVisitorKeys[node.type] ?? [];
  for (const key of keys) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) walk(c, file, code, violations, kind);
    } else if (child && typeof child === 'object' && child.type) {
      walk(child, file, code, violations, kind);
    }
  }
}

const BUTTON_NAMES = new Set(['Button', 'button', 'IconButton', 'SubmitButton']);

/**
 * @param {any} node
 * @param {string} file
 * @param {Violation[]} violations
 */
function checkTsxNode(node, file, violations) {
  // R1: Button sin onClick (excepto disabled, type="submit", asChild, href, formAction)
  if (
    node.type === 'JSXOpeningElement' &&
    node.name?.type === 'JSXIdentifier' &&
    BUTTON_NAMES.has(node.name.name)
  ) {
    const attrs = /** @type {any[]} */ (node.attributes ?? []);
    const has = (n) => attrs.some((a) => a.type === 'JSXAttribute' && a.name?.name === n);
    const hasOnClick = has('onClick');
    const isDisabled = has('disabled');
    const hasHref = has('href');
    const hasFormAction = has('formAction');
    const hasAsChild = has('asChild');
    const isSubmitOrReset = attrs.some(
      (a) =>
        a.type === 'JSXAttribute' &&
        a.name?.name === 'type' &&
        a.value?.type === 'Literal' &&
        (a.value.value === 'submit' || a.value.value === 'reset'),
    );
    if (
      !hasOnClick &&
      !isDisabled &&
      !isSubmitOrReset &&
      !hasHref &&
      !hasFormAction &&
      !hasAsChild
    ) {
      violations.push({
        file: relative(file),
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'button_no_handler',
        message:
          'Button sin onClick. Añade handler real, disabled, type="submit", href, formAction o asChild + Link.',
        severity: 'error',
      });
    }
  }

  // R2: form sin onSubmit
  if (
    node.type === 'JSXOpeningElement' &&
    node.name?.type === 'JSXIdentifier' &&
    node.name.name === 'form'
  ) {
    const attrs = /** @type {any[]} */ (node.attributes ?? []);
    const hasOnSubmit = attrs.some(
      (a) => a.type === 'JSXAttribute' && a.name?.name === 'onSubmit',
    );
    const hasAction = attrs.some(
      (a) => a.type === 'JSXAttribute' && a.name?.name === 'action',
    );
    if (!hasOnSubmit && !hasAction) {
      violations.push({
        file: relative(file),
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'form_no_onsubmit',
        message: '<form> sin onSubmit ni action. Usa react-hook-form handleSubmit o Server Action.',
        severity: 'error',
      });
    }
  }

  // R3: handlers no-op / placeholder en onClick / onSubmit / onChange / onPress
  if (
    node.type === 'JSXAttribute' &&
    typeof node.name?.name === 'string' &&
    /^on[A-Z]/.test(node.name.name) &&
    node.value?.type === 'JSXExpressionContainer'
  ) {
    const expr = node.value.expression;
    if (isEmptyArrow(expr)) {
      violations.push({
        file: relative(file),
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'empty_handler',
        message: `${node.name.name}={() => {}} es no-op. Wirea a una mutation real o elimínalo.`,
        severity: 'error',
      });
    }
    if (isPlaceholderCall(expr)) {
      violations.push({
        file: relative(file),
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'placeholder_handler',
        message: `${node.name.name} es alert()/console.* placeholder. Wirea a mutation real.`,
        severity: 'error',
      });
    }
  }

  // R4: Link / a con href="#" o href=""
  if (
    node.type === 'JSXAttribute' &&
    node.name?.name === 'href' &&
    node.value?.type === 'Literal' &&
    typeof node.value.value === 'string' &&
    (node.value.value === '#' || node.value.value === '')
  ) {
    violations.push({
      file: relative(file),
      line: node.loc.start.line,
      column: node.loc.start.column,
      pattern: 'dead_href',
      message: `href="${node.value.value}" muerto. Usa ruta válida o convierte a <button>.`,
      severity: 'error',
    });
  }

  // R5: useEffect sin deps array (corre en cada render)
  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'Identifier' &&
    node.callee.name === 'useEffect' &&
    Array.isArray(node.arguments) &&
    node.arguments.length === 1
  ) {
    violations.push({
      file: relative(file),
      line: node.loc.start.line,
      column: node.loc.start.column,
      pattern: 'useeffect_no_deps',
      message: 'useEffect sin dependency array — corre en cada render.',
      severity: 'warn',
    });
  }
}

/**
 * @param {any} node
 * @param {string} file
 * @param {string} code
 * @param {Violation[]} violations
 */
function checkRouterNode(node, file, code, violations) {
  // R6: throw new Error genérico sin marcar STUB.
  // Acepta el marcador STUB en cualquier línea anterior del archivo
  // (a nivel clase, método o archivo). Si el archivo nunca menciona STUB,
  // se considera throw genuino y se flagea.
  if (
    node.type === 'NewExpression' &&
    node.callee?.type === 'Identifier' &&
    node.callee.name === 'Error'
  ) {
    const before = code.slice(Math.max(0, node.range[0] - 50), node.range[0]);
    const isThrow =
      /throw\s*$/.test(before.replace(/\s+$/, '')) || /throw\s*\(\s*$/.test(before);
    if (!isThrow) return;

    const line = node.loc.start.line;
    const fileBefore = code.split('\n').slice(0, line).join('\n');
    if (STUB_COMMENT_RE.test(fileBefore)) return;

    // Heurística adicional: si el throw expone un mensaje claramente legítimo
    // (env missing, validation, lookup, upstream error), no es stub.
    const argText = code.slice(node.range[0], node.range[1]);
    const hasInterpolation = /\$\{/.test(argText);
    const validationKeywords =
      /missing|invalid|required|unknown|not[ _]found|\bno\b|\bfor\b|cannot|must\s+be|expected|fail|status|response|error|denied|exceed/i;
    if (hasInterpolation || validationKeywords.test(argText)) {
      return;
    }

    violations.push({
      file: relative(file),
      line,
      column: node.loc.start.column,
      pattern: 'unmarked_stub_error',
      message:
        'throw new Error sin "// STUB — activar FASE XX" ni mensaje de validación. Usa TRPCError NOT_IMPLEMENTED o marcá como STUB.',
      severity: 'error',
    });
  }
}

function isEmptyArrow(expr) {
  if (!expr) return false;
  if (expr.type === 'ArrowFunctionExpression') {
    const body = expr.body;
    if (body?.type === 'BlockStatement' && body.body.length === 0) return true;
    if (body?.type === 'Identifier' && body.name === 'undefined') return true;
  }
  if (expr.type === 'Identifier' && expr.name === 'noop') return true;
  return false;
}

function isPlaceholderCall(expr) {
  if (!expr || expr.type !== 'ArrowFunctionExpression') return false;
  const body =
    expr.body?.type === 'BlockStatement' ? expr.body.body[0]?.expression : expr.body;
  if (!body || body.type !== 'CallExpression') return false;
  const callee = body.callee;
  if (callee?.type === 'Identifier' && callee.name === 'alert') return true;
  if (
    callee?.type === 'MemberExpression' &&
    callee.object?.type === 'Identifier' &&
    callee.object.name === 'console'
  ) {
    return true;
  }
  return false;
}

function relative(abs) {
  return abs.startsWith(ROOT) ? abs.slice(ROOT.length + 1) : abs;
}

/** @param {Violation[]} violations */
function output(violations) {
  if (asJson) {
    process.stdout.write(JSON.stringify(violations, null, 2) + '\n');
    if (!isCi) {
      summary(violations);
    }
    return;
  }
  if (!violations.length) {
    console.log(pc.green('✓ audit-dead-ui: 0 violations (ADR-018)'));
    return;
  }
  for (const v of violations) {
    const sev = v.severity === 'error' ? pc.red('error') : pc.yellow('warn ');
    console.log(
      `${sev} ${pc.cyan(v.file)}:${v.line}:${v.column}  ${pc.dim(v.pattern)}  ${v.message}`,
    );
  }
  summary(violations);
}

/** @param {Violation[]} violations */
function summary(violations) {
  const errors = violations.filter((v) => v.severity === 'error').length;
  const warns = violations.filter((v) => v.severity === 'warn').length;
  if (errors) console.log(pc.red(`\n${errors} error(s)`) + (warns ? pc.yellow(` · ${warns} warn(s)`) : ''));
  else if (warns) console.log(pc.yellow(`\n${warns} warn(s)`));
}

await main();
