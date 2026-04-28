import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  applyAutoImportToBrandKit,
  isStep1Complete,
} from '@/features/dmx-studio/lib/cross-functions/auto-import-asesor';
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
    redirect(`/${locale}/auth/login?next=/${locale}/studio-app`);
  }

  const { data: extension } = await supabase
    .from('studio_users_extension')
    .select('studio_role, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!extension) {
    let skipStep1 = false;
    try {
      await applyAutoImportToBrandKit(supabase, user.id);
      const { data: brandKit } = await supabase
        .from('studio_brand_kits')
        .select('display_name, contact_phone, zones')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();
      if (brandKit) {
        skipStep1 = isStep1Complete({
          display_name: brandKit.display_name,
          contact_phone: brandKit.contact_phone,
          zones: brandKit.zones,
        });
      }
    } catch (err) {
      console.error('[studio-layout] auto-import failed:', err);
      skipStep1 = false;
    }

    const { error: extensionUpsertError } = await supabase.from('studio_users_extension').upsert(
      {
        user_id: user.id,
        studio_role: 'studio_user',
        onboarding_completed: false,
      },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
    if (extensionUpsertError) {
      console.error('[studio-layout] extension upsert failed:', extensionUpsertError);
    }

    const target = skipStep1
      ? `/${locale}/studio-app/onboarding?skip_step1=true`
      : `/${locale}/studio-app/onboarding`;
    redirect(target);
  }

  const validRoles = new Set(['studio_user', 'studio_admin', 'studio_photographer']);
  if (!validRoles.has(extension.studio_role)) {
    redirect(`/${locale}/dashboard?reason=studio_role_required`);
  }

  return <>{children}</>;
}
