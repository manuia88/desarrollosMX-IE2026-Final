import { redirect } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/server';

export async function requireStudioOnboardingComplete(locale: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/studio`);
  }
  const { data: extension } = await supabase
    .from('studio_users_extension')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!extension || !extension.onboarding_completed) {
    redirect(`/${locale}/studio/onboarding`);
  }
}
