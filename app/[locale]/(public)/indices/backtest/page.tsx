import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BacktestConsole } from './backtest-console';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.backtest' });
  return {
    title: t('title'),
    description: t('meta_description'),
  };
}

export default async function BacktestPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.backtest' });

  return (
    <main
      className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-8"
      style={{ color: 'var(--color-text-primary)' }}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('subtitle')}</p>
      </header>
      <BacktestConsole />
    </main>
  );
}
