import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/shared/lib/supabase/server';

interface StudioLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function StudioLayout({ children, params }: StudioLayoutProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio`);
  }

  const { data: extension } = await supabase
    .from('studio_users_extension')
    .select('studio_role, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!extension) {
    await supabase.from('studio_users_extension').insert({
      user_id: user.id,
      studio_role: 'studio_user',
      onboarding_completed: false,
    });
    redirect(`/${locale}/studio/onboarding`);
  }

  const validRoles = new Set(['studio_user', 'studio_admin', 'studio_photographer']);
  if (!validRoles.has(extension.studio_role)) {
    redirect(`/${locale}/dashboard?reason=studio_role_required`);
  }

  return <>{children}</>;
}
