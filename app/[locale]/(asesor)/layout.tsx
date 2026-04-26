import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AsesorShell, type ShellUser } from '@/features/asesor-shell';
import { ALLOWED_ASESOR_ROLES } from '@/features/asesor-shell/lib/nav-items';
import { createClient } from '@/shared/lib/supabase/server';

interface AsesorLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AsesorLayout({ children, params }: AsesorLayoutProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, rol, country_code')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.rol ?? null;
  if (!profile || !role || !ALLOWED_ASESOR_ROLES.has(role)) {
    redirect(`/${locale}/profile?reason=role_required`);
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  const shellUser: ShellUser = {
    id: profile.id,
    name: fullName.length > 0 ? fullName : (profile.email ?? null),
    avatarUrl: null,
    role,
  };

  return (
    <AsesorShell user={shellUser} locale={locale}>
      {children}
    </AsesorShell>
  );
}
