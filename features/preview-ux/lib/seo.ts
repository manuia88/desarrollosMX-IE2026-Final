import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { PersonaType } from '../types';

const NAMESPACE_BY_PERSONA: Readonly<Record<PersonaType, string>> = {
  comprador: 'PreviewComprador',
  asesor: 'PreviewAsesor',
  developer: 'PreviewDeveloper',
  masterbroker: 'PreviewMasterBroker',
};

export interface BuildPreviewMetadataArgs {
  readonly locale: string;
  readonly persona: PersonaType;
}

export async function buildPreviewMetadata({
  locale,
  persona,
}: BuildPreviewMetadataArgs): Promise<Metadata> {
  const namespace = NAMESPACE_BY_PERSONA[persona];
  const t = await getTranslations({ locale, namespace });
  const title = t('meta_title');
  const description = t('meta_description');
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export interface PreviewJsonLdArgs {
  readonly locale: string;
  readonly persona: PersonaType;
  readonly title: string;
  readonly description: string;
}

export interface PreviewJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'SoftwareApplication';
  readonly name: string;
  readonly description: string;
  readonly applicationCategory: 'BusinessApplication';
  readonly operatingSystem: 'Web';
  readonly offers: {
    readonly '@type': 'Offer';
    readonly price: '0';
    readonly priceCurrency: 'USD';
  };
  readonly inLanguage: string;
  readonly audience: {
    readonly '@type': 'Audience';
    readonly audienceType: PersonaType;
  };
}

export function buildPreviewJsonLd({
  locale,
  persona,
  title,
  description,
}: PreviewJsonLdArgs): PreviewJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: title,
    description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    inLanguage: locale,
    audience: {
      '@type': 'Audience',
      audienceType: persona,
    },
  };
}

export function getPreviewNamespace(persona: PersonaType): string {
  return NAMESPACE_BY_PERSONA[persona];
}
