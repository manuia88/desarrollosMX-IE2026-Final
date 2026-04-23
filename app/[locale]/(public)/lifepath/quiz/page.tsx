// BLOQUE 11.O.2.2 — LifePath quiz multi-step 15 preguntas.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LifePathQuiz } from '@/features/lifepath/components/LifePathQuiz';
import { locales } from '@/shared/lib/i18n/config';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LifePath.quiz' });
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}/lifepath/quiz`] as const),
  ) as Record<string, string>;

  return {
    title: t('title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}/lifepath/quiz`,
      languages,
    },
  };
}

export default async function LifePathQuizPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'LifePath' });

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[color:var(--color-text-secondary)]">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={`/${locale}/lifepath`} className="hover:underline">
              {t('page.title')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[color:var(--color-text-primary)]">
            {t('quiz.title')}
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t('quiz.title')}</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('quiz.intro')}</p>
      </header>

      <LifePathQuiz locale={locale} />
    </main>
  );
}
