import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  type BacktestHashInput,
  decodeBacktestHash,
} from '@/features/indices-publicos/lib/backtest-hash';
import { BacktestConsole } from './backtest-console';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickHash(searchParams: Record<string, string | string[] | undefined>): string | null {
  const raw = searchParams.h;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].length > 0) return raw[0];
  return null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.backtest' });

  const hash = pickHash(sp);
  if (hash) {
    const decoded = decodeBacktestHash(hash);
    if (decoded) {
      return {
        title: t('share.og_title', {
          indexCode: decoded.indexCode,
          count: decoded.scopeIds.length,
        }),
        description: t('share.og_description', {
          indexCode: decoded.indexCode,
          count: decoded.scopeIds.length,
        }),
      };
    }
  }

  return {
    title: t('title'),
    description: t('meta_description'),
  };
}

export default async function BacktestPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'IndicesPublic.backtest' });

  const hash = pickHash(sp);
  const initial: BacktestHashInput | null = hash ? decodeBacktestHash(hash) : null;

  return (
    <main
      className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-8"
      style={{ color: 'var(--color-text-primary)' }}
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('subtitle')}</p>
      </header>
      <BacktestConsole initial={initial} />
    </main>
  );
}
