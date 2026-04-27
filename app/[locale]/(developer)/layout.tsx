import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ALLOWED_DEV_ROLES, type DevHeaderUser, DevShell } from '@/features/dev-shell';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

interface DeveloperLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DeveloperLayout({ children, params }: DeveloperLayoutProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/desarrolladores/dashboard`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, rol, country_code, desarrolladora_id, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.rol ?? null;
  if (!profile || !role || !ALLOWED_DEV_ROLES.has(role)) {
    redirect(`/${locale}/profile?reason=role_required_dev`);
  }

  let companyName: string | null = null;
  if (profile.desarrolladora_id) {
    const admin = createAdminClient();
    const { data: dev } = await admin
      .from('desarrolladoras')
      .select('name')
      .eq('id', profile.desarrolladora_id)
      .maybeSingle();
    companyName = dev?.name ?? null;
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  const shellUser: DevHeaderUser = {
    id: profile.id,
    name: fullName.length > 0 ? fullName : (profile.email ?? null),
    avatarUrl: profile.avatar_url ?? null,
    role,
  };

  return (
    <DevShell user={shellUser} companyName={companyName} locale={locale}>
      {children}
    </DevShell>
  );
}
