import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export interface StudioFooterProps {
  readonly locale: string;
}

export async function StudioFooter({ locale }: StudioFooterProps) {
  const t = await getTranslations({ locale, namespace: 'Studio.footer' });
  return (
    <footer
      role="contentinfo"
      aria-label="DMX Studio footer"
      className="relative border-t"
      style={{
        borderColor: 'var(--canon-border)',
        background: 'var(--canon-bg-2)',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <span
            className="font-[var(--font-display)] text-base font-semibold"
            style={{ color: 'var(--canon-cream)' }}
          >
            {t('tagline')}
          </span>
          <DisclosurePill tone="indigo">{t('disclosureLabel')}</DisclosurePill>
        </div>
        <nav aria-label="Footer links" className="flex flex-wrap items-center gap-6 text-sm">
          <Link
            href={`/${locale}/legal/privacidad`}
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--canon-cream-2)' }}
          >
            {t('linkPrivacy')}
          </Link>
          <Link
            href={`/${locale}/legal/terminos`}
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--canon-cream-2)' }}
          >
            {t('linkTerms')}
          </Link>
          <Link
            href={`/${locale}/faq`}
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--canon-cream-2)' }}
          >
            {t('linkContact')}
          </Link>
        </nav>
      </div>
      <div
        className="border-t px-6 py-4 text-center text-xs"
        style={{
          borderColor: 'var(--canon-border)',
          color: 'var(--canon-cream-3)',
        }}
      >
        {t('copyright')}
      </div>
    </footer>
  );
}
