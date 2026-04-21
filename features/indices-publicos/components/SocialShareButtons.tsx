'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/shared/ui/primitives/cn';

export interface SocialShareButtonsProps {
  readonly url: string;
  readonly text: string;
  readonly className?: string;
}

function buildWhatsappHref(url: string, text: string): string {
  const encoded = encodeURIComponent(`${text} ${url}`);
  return `https://wa.me/?text=${encoded}`;
}

function buildTwitterHref(url: string, text: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function buildLinkedinHref(url: string): string {
  const params = new URLSearchParams({ url });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

export function SocialShareButtons({ url, text, className }: SocialShareButtonsProps) {
  const t = useTranslations('IndicesPublic.share');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const buttonClass =
    'inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-3 text-sm text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]';

  return (
    <section
      className={cn('flex flex-wrap items-center gap-2', className)}
      aria-label={t('heading')}
    >
      <a
        href={buildWhatsappHref(url, text)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('whatsapp')}
        className={buttonClass}
        data-testid="share-whatsapp"
      >
        <span>WhatsApp</span>
      </a>
      <a
        href={buildTwitterHref(url, text)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('twitter')}
        className={buttonClass}
        data-testid="share-twitter"
      >
        <span>X</span>
      </a>
      <a
        href={buildLinkedinHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('linkedin')}
        className={buttonClass}
        data-testid="share-linkedin"
      >
        <span>LinkedIn</span>
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t('copy_link')}
        aria-live="polite"
        className={buttonClass}
        data-testid="share-copy"
      >
        <span>{copied ? t('copied') : t('copy_link')}</span>
      </button>
    </section>
  );
}
