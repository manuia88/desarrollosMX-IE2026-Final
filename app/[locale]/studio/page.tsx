import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FoundersCohortBadge } from '@/features/dmx-studio/components/landing/FoundersCohortBadge';
import { PricingComparison3Tier } from '@/features/dmx-studio/components/landing/PricingComparison3Tier';
import { StudioFAQ } from '@/features/dmx-studio/components/landing/StudioFAQ';
import { StudioFooter } from '@/features/dmx-studio/components/landing/StudioFooter';
import { StudioHero } from '@/features/dmx-studio/components/landing/StudioHero';
import { TrustSignals } from '@/features/dmx-studio/components/landing/TrustSignals';
import { WaitlistFormStudio } from '@/features/dmx-studio/components/landing/WaitlistFormStudio';
import { defaultLocale, locales } from '@/shared/lib/i18n/config';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  readonly params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return [{ locale: defaultLocale }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Studio.meta' });
  const languages = Object.fromEntries(locales.map((l) => [l, `/${l}/studio`] as const)) as Record<
    string,
    string
  >;
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/studio`,
      languages,
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      url: `/${locale}/studio`,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}

interface StudioPublicMetrics {
  readonly waitlistCount: number;
  readonly asesoresCount: number;
  readonly foundersTotal: number;
  readonly foundersUsed: number;
  readonly foundersRemaining: number;
}

const FOUNDERS_TOTAL = 50;

async function fetchStudioPublicMetrics(): Promise<StudioPublicMetrics> {
  try {
    const supabase = createAdminClient();
    const [waitlistRes, asesorRes, foundersUsedRes] = await Promise.all([
      supabase.from('studio_waitlist').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('rol', 'asesor')
        .eq('is_active', true),
      supabase
        .from('studio_waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('founders_cohort_eligible', true),
    ]);
    const waitlistCount = waitlistRes.error ? 0 : (waitlistRes.count ?? 0);
    const asesoresCount = asesorRes.error ? 0 : (asesorRes.count ?? 0);
    const foundersUsed = foundersUsedRes.error ? 0 : (foundersUsedRes.count ?? 0);
    return {
      waitlistCount,
      asesoresCount,
      foundersTotal: FOUNDERS_TOTAL,
      foundersUsed,
      foundersRemaining: Math.max(FOUNDERS_TOTAL - foundersUsed, 0),
    };
  } catch {
    return {
      waitlistCount: 0,
      asesoresCount: 0,
      foundersTotal: FOUNDERS_TOTAL,
      foundersUsed: 0,
      foundersRemaining: FOUNDERS_TOTAL,
    };
  }
}

export default async function StudioLandingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const metrics = await fetchStudioPublicMetrics();

  return (
    <>
      <StudioHero />
      <PricingComparison3Tier foundersEligible={metrics.foundersRemaining > 0} />
      <TrustSignals
        waitlistCount={metrics.waitlistCount}
        asesoresCount={metrics.asesoresCount}
        foundersRemaining={metrics.foundersRemaining}
      />
      <FoundersCohortBadge
        foundersRemaining={metrics.foundersRemaining}
        foundersTotal={metrics.foundersTotal}
      />
      <StudioFAQ />
      <section
        id="waitlist"
        aria-label="Studio waitlist"
        className="relative px-6 py-20"
        style={{ background: 'var(--canon-bg-2)' }}
      >
        <div className="mx-auto max-w-2xl">
          <WaitlistFormStudio />
        </div>
      </section>
      <StudioFooter locale={locale} />
    </>
  );
}
