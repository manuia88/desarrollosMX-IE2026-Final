import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ALLOWED_DEV_ROLES } from '@/features/dev-shell';
import { AvanceObraManager } from '@/features/developer/components/inventario/AvanceObraManager';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dev.inventario' });
  return { title: `${t('subnav.avanceObra')} · ${t('metaTitle')}` };
}

export default async function AvanceObraRoute({ params }: RouteProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/desarrolladores/inventario/avance-obra`);
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ALLOWED_DEV_ROLES.has(profile.rol)) {
    redirect(`/${locale}/profile?reason=role_required_dev`);
  }
  const t = await getTranslations({ locale, namespace: 'dev.inventario' });
  return (
    <div className="space-y-4">
      <SubNav locale={locale} active="avanceObra" t={t} />
      <AvanceObraManager locale={locale} />
    </div>
  );
}

function SubNav({
  locale,
  active,
  t,
}: {
  locale: string;
  active: 'unidades' | 'prototipos' | 'esquemasPago' | 'avanceObra';
  t: (k: string) => string;
}) {
  const items = [
    { key: 'unidades' as const, href: `/${locale}/desarrolladores/inventario` },
    { key: 'prototipos' as const, href: `/${locale}/desarrolladores/inventario/prototipos` },
    { key: 'esquemasPago' as const, href: `/${locale}/desarrolladores/inventario/esquemas-pago` },
    { key: 'avanceObra' as const, href: `/${locale}/desarrolladores/inventario/avance-obra` },
  ];
  return (
    <nav aria-label={t('subnav.ariaLabel')} className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            active === it.key
              ? 'border-violet-400/40 bg-violet-600/20 text-violet-100'
              : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          {t(`subnav.${it.key}`)}
        </Link>
      ))}
    </nav>
  );
}
