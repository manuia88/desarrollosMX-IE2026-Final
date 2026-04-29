import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}

export default async function ProfileRoute({ params, searchParams }: RouteProps) {
  const { locale } = await params;
  const { reason } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, rol, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();

  const reasonMessages: Record<string, string> = {
    role_required_dev: 'Tu rol actual no tiene acceso al portal Desarrollador.',
    role_required_asesor: 'Tu rol actual no tiene acceso al portal Asesor.',
    role_required_admin: 'Tu rol actual no tiene acceso al portal Admin.',
  };
  const reasonText = reason && reasonMessages[reason] ? reasonMessages[reason] : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>

      {reasonText && (
        <div className="rounded border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
          {reasonText}
        </div>
      )}

      <section className="space-y-2 rounded border p-4">
        <h2 className="text-lg font-medium">Datos</h2>
        <p className="text-sm">
          <span className="font-medium">Email:</span> {profile?.email ?? user.email}
        </p>
        <p className="text-sm">
          <span className="font-medium">Nombre:</span>{' '}
          {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="text-sm">
          <span className="font-medium">Rol:</span> {profile?.rol ?? 'sin rol'}
        </p>
      </section>

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href={`/${locale}/profile/seguridad`} className="underline">
          Seguridad (MFA)
        </Link>
        <Link href={`/${locale}/auth/logout`} className="underline">
          Cerrar sesión
        </Link>
      </nav>
    </main>
  );
}
