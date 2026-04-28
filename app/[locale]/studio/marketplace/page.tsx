// F14.F.10 Sprint 9 SUB-AGENT 4 — Marketplace público fotógrafos verified.
// Server component RSC publicProcedure cero auth.

import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import {
  MarketplaceListing,
  type MarketplacePhotographer,
} from '@/features/dmx-studio/components/photographer-public/MarketplaceListing';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface PageProps {
  readonly params: Promise<{ locale: string }>;
}

interface DirectoryRow {
  readonly id: string;
  readonly photographer_id: string;
  readonly listing_priority: number | null;
  readonly tags: ReadonlyArray<string> | null;
  readonly verified_at: string | null;
  readonly studio_photographers: {
    readonly business_name: string;
    readonly slug: string;
    readonly bio: string | null;
    readonly rating_avg: number | string | null;
    readonly speciality_zones: ReadonlyArray<string> | null;
    readonly clients_count: number | string | null;
  } | null;
}

async function loadDirectory(): Promise<ReadonlyArray<MarketplacePhotographer>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('studio_photographer_directory')
    .select(
      'id, photographer_id, listing_priority, tags, verified_at, studio_photographers!inner(business_name, slug, bio, rating_avg, speciality_zones, clients_count)',
    )
    .eq('listing_status', 'verified')
    .order('listing_priority', { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as ReadonlyArray<DirectoryRow>;
  return rows
    .filter((r) => r.studio_photographers !== null)
    .map((r) => {
      const ph = r.studio_photographers;
      if (!ph) {
        // unreachable due to filter above but narrows for TS
        throw new Error('photographer relation missing');
      }
      return {
        id: r.id,
        photographerId: r.photographer_id,
        businessName: ph.business_name,
        slug: ph.slug,
        bio: ph.bio,
        ratingAvg: Number(ph.rating_avg ?? 0),
        specialityZones: (ph.speciality_zones ?? []) as ReadonlyArray<string>,
        clientsCount: Number(ph.clients_count ?? 0),
        tags: (r.tags ?? []) as ReadonlyArray<string>,
        listingPriority: Number(r.listing_priority ?? 0),
      };
    });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Marketplace de fotógrafos · DMX Studio',
    description:
      'Directorio público de fotógrafos inmobiliarios verificados — videos profesionales generados con IA',
    openGraph: {
      title: 'Marketplace fotógrafos · DMX Studio',
      description:
        'Encuentra fotógrafos inmobiliarios verificados en tu zona. Servicio profesional de video con IA.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Marketplace fotógrafos · DMX Studio',
      description: 'Directorio público de fotógrafos inmobiliarios verificados',
    },
    alternates: {
      canonical: `/${locale}/studio/marketplace`,
    },
  };
}

export default async function StudioMarketplacePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const photographers = await loadDirectory();

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 24px',
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      <header style={{ textAlign: 'center', padding: '32px 0 16px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '40px',
            color: 'var(--canon-cream)',
            margin: 0,
            lineHeight: 1.1,
            backgroundImage: 'linear-gradient(90deg, #6366F1, #EC4899)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Marketplace de fotógrafos
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-text)',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.7)',
            marginTop: '12px',
            maxWidth: '640px',
            marginInline: 'auto',
            lineHeight: 1.5,
          }}
        >
          Fotógrafos inmobiliarios verificados que generan videos profesionales con IA en tu zona.
        </p>
      </header>
      <MarketplaceListing photographers={photographers} locale={locale} />
    </main>
  );
}
