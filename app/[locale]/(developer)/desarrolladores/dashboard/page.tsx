import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { DevDashboardPage } from '@/features/developer/components/DevDashboardPage';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.dashboard' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

function calcYearsOperating(createdAt: string | null): number | null {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

export default async function DeveloperDashboardRoute({ params }: RouteProps) {
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
    .select('id, desarrolladora_id')
    .eq('id', user.id)
    .maybeSingle();

  let company = {
    name: 'Mi Desarrolladora',
    legalName: null as string | null,
    taxId: null as string | null,
    logoUrl: null as string | null,
    yearsOperating: null as number | null,
    isVerified: false,
  };

  if (profile?.desarrolladora_id) {
    const admin = createAdminClient();
    const { data: dev } = await admin
      .from('desarrolladoras')
      .select('name, legal_name, tax_id, logo_url, is_verified, created_at')
      .eq('id', profile.desarrolladora_id)
      .maybeSingle();
    if (dev) {
      company = {
        name: dev.name ?? 'Mi Desarrolladora',
        legalName: dev.legal_name,
        taxId: dev.tax_id,
        logoUrl: dev.logo_url,
        yearsOperating: calcYearsOperating(dev.created_at),
        isVerified: Boolean(dev.is_verified),
      };
    }
  }

  return <DevDashboardPage company={company} />;
}
