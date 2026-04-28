// F14.F.8 Sprint 7 BIBLIA Upgrade 3 — SEO meta + JSON-LD schema.org per gallery.

import type { PublicGalleryData } from './PublicGalleryPage';

interface Props {
  readonly data: PublicGalleryData;
  readonly slug: string;
  readonly videosCount: number;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://desarrollosmx.com';

export function SeoMeta({ data, slug, videosCount }: Props) {
  const displayName = data.brandKit?.display_name ?? data.gallery.title;
  const tagline = data.brandKit?.tagline ?? data.gallery.bio ?? '';
  const url = `${BASE_URL}/studio/${slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    description: tagline,
    url,
    image: data.gallery.cover_image_url,
    jobTitle: 'Asesor inmobiliario',
    worksFor: {
      '@type': 'Organization',
      name: 'DMX Studio',
      url: BASE_URL,
    },
    mainEntityOfPage: {
      '@type': 'ProfilePage',
      '@id': url,
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/WatchAction',
      userInteractionCount: data.gallery.view_count + videosCount * 0,
    },
  };
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: schema.org JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
