#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, '..', 'messages');
const CANONICAL_LOCALE = 'es-MX';

function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

async function loadLocale(locale) {
  const content = await readFile(resolve(MESSAGES_DIR, `${locale}.json`), 'utf8');
  return JSON.parse(content);
}

async function main() {
  const entries = await readdir(MESSAGES_DIR);
  const locales = entries
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => entry.replace(/\.json$/, ''))
    .sort();

  if (!locales.includes(CANONICAL_LOCALE)) {
    console.error(`✗ missing canonical locale: ${CANONICAL_LOCALE}`);
    process.exit(1);
  }

  const canonical = await loadLocale(CANONICAL_LOCALE);
  const canonicalKeys = collectKeys(canonical).sort();
  const canonicalSet = new Set(canonicalKeys);

  let hasError = false;
  for (const locale of locales) {
    if (locale === CANONICAL_LOCALE) continue;
    const other = await loadLocale(locale);
    const otherKeys = collectKeys(other);
    const otherSet = new Set(otherKeys);

    const missing = canonicalKeys.filter((k) => !otherSet.has(k));
    const extra = otherKeys.filter((k) => !canonicalSet.has(k));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`✓ ${locale}: ${otherKeys.length} keys match ${CANONICAL_LOCALE}`);
      continue;
    }

    hasError = true;
    console.error(`✗ ${locale}:`);
    if (missing.length) {
      console.error(`  missing ${missing.length} keys:`);
      for (const k of missing) console.error(`    - ${k}`);
    }
    if (extra.length) {
      console.error(`  extra ${extra.length} keys not in ${CANONICAL_LOCALE}:`);
      for (const k of extra) console.error(`    + ${k}`);
    }
  }

  if (hasError) {
    console.error('\ni18n key parity check failed.');
    process.exit(1);
  }
  console.log(`\n✓ all ${locales.length} locales match canonical ${CANONICAL_LOCALE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
