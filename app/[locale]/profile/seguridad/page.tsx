import { redirect } from 'next/navigation';
import { BackupCodesPanel } from '@/features/auth/components/backup-codes-panel';
import { MfaStatusPanel } from '@/features/auth/components/mfa-status-panel';
import { SessionsList } from '@/features/auth/components/sessions-list';
import { SignOutAllButton } from '@/features/auth/components/sign-out-all-button';
import { createClient } from '@/shared/lib/supabase/server';

export default async function SeguridadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, meta')
    .eq('id', user.id)
    .maybeSingle();

  const meta = (profile?.meta ?? {}) as { mfa_enabled?: boolean };
  const mfaEnabled = meta.mfa_enabled === true;

  const { data: sessions } = await supabase
    .from('auth_sessions_log')
    .select('id, action, created_at, meta')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Seguridad de la cuenta</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Gestiona tu MFA, códigos de respaldo y sesiones activas.
        </p>
      </header>

      <section className="rounded-md border p-6">
        <h2 className="text-lg font-medium">Autenticación de dos factores</h2>
        <div className="mt-4">
          <MfaStatusPanel mfaEnabled={mfaEnabled} rol={profile?.rol ?? ''} />
        </div>
      </section>

      <section className="rounded-md border p-6">
        <h2 className="text-lg font-medium">Códigos de respaldo</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Úsalos si pierdes el acceso a tu app de autenticador. Cada código es de un solo uso.
        </p>
        <div className="mt-4">
          <BackupCodesPanel />
        </div>
      </section>

      <section className="rounded-md border p-6">
        <h2 className="text-lg font-medium">Actividad de sesión reciente</h2>
        <p className="mt-1 text-sm text-neutral-600">Últimos 10 eventos de tu cuenta.</p>
        <div className="mt-4">
          <SessionsList
            sessions={(sessions ?? []).map((s) => ({
              id: s.id,
              action: s.action ?? 'unknown',
              created_at: s.created_at ?? '',
              meta: (s.meta ?? null) as Record<string, unknown> | null,
            }))}
          />
        </div>
      </section>

      <section className="rounded-md border p-6">
        <h2 className="text-lg font-medium">Cerrar sesión en todos los dispositivos</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Revoca todos los refresh tokens activos. Deberás iniciar sesión de nuevo en cada
          dispositivo.
        </p>
        <div className="mt-4">
          <SignOutAllButton />
        </div>
      </section>
    </main>
  );
}
