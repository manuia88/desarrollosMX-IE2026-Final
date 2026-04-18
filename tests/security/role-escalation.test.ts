import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = Boolean(url && serviceRole && serviceRole !== 'dummy-service-role-for-ci-build');

function getAdmin(): SupabaseClient {
  return createClient(url as string, serviceRole as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe.skipIf(!canRun)('security · prevent_role_escalation (ADR-009 D4)', () => {
  it('función prevent_role_escalation no aparece en SECDEF_NO_AUTH_CHECK (guard clauses presentes)', async () => {
    const admin = getAdmin();
    const { data, error } = await admin.rpc('audit_rls_violations');
    expect(error).toBeNull();
    const secdefMiss = (data ?? []).filter(
      (r: { category: string; object_name: string }) =>
        r.category === 'SECDEF_NO_AUTH_CHECK' && r.object_name.includes('prevent_role_escalation'),
    );
    expect(secdefMiss).toHaveLength(0);
  });
});

describe.skipIf(!canRun)('security · audit_rls_violations smoke (CI gate)', () => {
  it('no retorna violaciones en remote', async () => {
    const admin = getAdmin();
    const { data, error } = await admin.rpc('audit_rls_violations');
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});

describe('security · fase 06 infra smoke (always-on)', () => {
  it('tests/security directory carga sin errores aunque env no esté seteado', () => {
    expect(typeof canRun).toBe('boolean');
  });
});
