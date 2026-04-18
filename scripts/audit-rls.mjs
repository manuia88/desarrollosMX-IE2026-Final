#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  // En CI sin secret (ej: GitHub Secrets sin SUPABASE_SERVICE_ROLE_KEY): skip con warning.
  // Forzar strict con env AUDIT_RLS_STRICT=1 cuando todo esté configurado.
  if (process.env.AUDIT_RLS_STRICT === '1') {
    console.error('✗ missing env NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  console.warn(
    '⚠ audit-rls SKIPPED: missing env NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Añade SUPABASE_SERVICE_ROLE_KEY a GitHub Secrets y setea AUDIT_RLS_STRICT=1 para bloquear.',
  );
  process.exit(0);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.rpc('audit_rls_violations');

if (error) {
  console.error('✗ rpc audit_rls_violations failed:', error.message);
  process.exit(1);
}

const rows = data ?? [];

if (rows.length === 0) {
  console.log('✓ audit-rls: 0 violations (ADR-009 D2/D3/D5 OK)');
  process.exit(0);
}

const grouped = rows.reduce((acc, r) => {
  acc[r.category] ??= [];
  acc[r.category].push(r);
  return acc;
}, {});

console.error(
  `✗ audit-rls: ${rows.length} violation(s) across ${Object.keys(grouped).length} category/ies`,
);
for (const [category, items] of Object.entries(grouped)) {
  console.error(`\n  [${category}] ${items.length}`);
  for (const it of items) {
    console.error(`    - ${it.object_name} — ${it.detail}`);
  }
}
process.exit(1);
