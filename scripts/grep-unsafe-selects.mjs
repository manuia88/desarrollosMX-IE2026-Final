#!/usr/bin/env node
// FASE 06 / MÓDULO 6.A.3
// Detecta SELECTs cross-user en tablas base (profiles, desarrolladoras, agencies, broker_companies)
// desde Client Components. La regla (ADR-009 D5) es que datos semi-públicos sólo se consumen
// via VIEW public_*. Este script falla el CI si encuentra SELECTs directas desde Client Component
// a esas tablas.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SCAN_DIRS = ['app', 'features', 'shared'];
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'tests']);
const EXTS = new Set(['.ts', '.tsx']);

const BASE_TABLES = ['profiles', 'desarrolladoras', 'agencies', 'broker_companies'];
const PUBLIC_VIEW_PREFIX = 'public_';

const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.isFile() && EXTS.has(full.slice(full.lastIndexOf('.')))) {
      await scan(full);
    }
  }
}

async function scan(file) {
  const src = await readFile(file, 'utf8');
  const lines = src.split('\n');

  const isClientComponent = /^\s*['"]use client['"]\s*;?\s*$/m.test(src);
  if (!isClientComponent) return;

  for (const table of BASE_TABLES) {
    const pattern = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`, 'g');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!pattern.test(line)) {
        pattern.lastIndex = 0;
        continue;
      }
      pattern.lastIndex = 0;

      // Allow if wrapped by comment "allow cross-user" on same or prev line
      const prev = lines[i - 1] ?? '';
      if (/allow-cross-user/i.test(line) || /allow-cross-user/i.test(prev)) continue;

      // Allow if the same line uses public_<table>
      const publicView = new RegExp(`\\.from\\(['"\`]${PUBLIC_VIEW_PREFIX}`);
      if (publicView.test(line)) continue;

      violations.push({
        file: file.replace(ROOT + sep, ''),
        line: i + 1,
        table,
        snippet: line.trim().slice(0, 200),
      });
    }
  }
}

for (const d of SCAN_DIRS) {
  const p = resolve(ROOT, d);
  try {
    await walk(p);
  } catch {
    // dir may not exist yet — ignore
  }
}

if (violations.length === 0) {
  console.log('✓ grep-unsafe-selects: 0 violations (ADR-009 D5 OK)');
  process.exit(0);
}

console.error(`✗ grep-unsafe-selects: ${violations.length} violation(s)`);
console.error('  Client Components must consume public_* VIEWs, not base tables.');
for (const v of violations) {
  console.error(`    ${v.file}:${v.line} — supabase.from('${v.table}')`);
  console.error(`      ${v.snippet}`);
}
console.error(
  "\n  Fix: switch .from('<table>') to .from('public_<table>'), or add `// allow-cross-user: <reason>` comment.",
);
process.exit(1);
