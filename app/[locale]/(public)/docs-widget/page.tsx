import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  readonly params: Promise<{ locale: string }>;
}

interface SnippetDef {
  readonly id: 'score' | 'pulse' | 'pulse_vs';
  readonly width: number;
  readonly height: number;
  readonly src: string;
}

const SNIPPETS: ReadonlyArray<SnippetDef> = [
  { id: 'score', width: 400, height: 500, src: 'https://desarrollosmx.com/embed/score/roma-norte' },
  { id: 'pulse', width: 400, height: 500, src: 'https://desarrollosmx.com/embed/pulse/roma-norte' },
  {
    id: 'pulse_vs',
    width: 720,
    height: 500,
    src: 'https://desarrollosmx.com/embed/pulse/narvarte/vs/roma-norte',
  },
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'WidgetEmbed.docs' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/docs-widget`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/docs-widget`,
      languages,
    },
    openGraph: {
      title: t('title'),
      description: t('meta_description'),
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('meta_description'),
    },
  };
}

function buildIframeSnippet(def: SnippetDef): string {
  return `<iframe src="${def.src}" width="${def.width}" height="${def.height}" frameborder="0" loading="lazy"></iframe>`;
}

export default async function DocsWidgetPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'WidgetEmbed.docs' });

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:underline">
              DesarrollosMX
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text-primary)]">
          {t('title')}
        </h1>
        <p className="text-base text-[color:var(--color-text-secondary)]">{t('subtitle')}</p>
      </header>

      <section aria-label={t('section_variants_label')} className="space-y-6">
        {SNIPPETS.map((def) => (
          <article
            key={def.id}
            className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-6"
          >
            <header className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold text-[color:var(--color-text-primary)]">
                {t(`variants.${def.id}.title`)}
              </h2>
              <span className="text-xs text-[color:var(--color-text-secondary)]">
                {def.width} × {def.height}
              </span>
            </header>
            <p className="mb-3 text-sm text-[color:var(--color-text-secondary)]">
              {t(`variants.${def.id}.description`)}
            </p>
            <figure aria-label={t('snippet_aria', { variant: t(`variants.${def.id}.title`) })}>
              <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-sunken)] p-3 font-mono text-xs text-[color:var(--color-text-primary)]">
                <code>{buildIframeSnippet(def)}</code>
              </pre>
            </figure>
          </article>
        ))}
      </section>

      <section
        aria-label={t('section_customization_label')}
        className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-6"
      >
        <h2 className="mb-3 text-xl font-semibold text-[color:var(--color-text-primary)]">
          {t('customization.title')}
        </h2>
        <p className="mb-3 text-sm text-[color:var(--color-text-secondary)]">
          {t('customization.description')}
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[color:var(--color-text-primary)]">
          <li>
            <code className="font-mono">?theme=light|dark|auto</code> —{' '}
            {t('customization.theme_description')}
          </li>
          <li>
            <code className="font-mono">?locale=es-MX|es-CO|es-AR|pt-BR|en-US</code> —{' '}
            {t('customization.locale_description')}
          </li>
        </ul>
      </section>
    </main>
  );
}
