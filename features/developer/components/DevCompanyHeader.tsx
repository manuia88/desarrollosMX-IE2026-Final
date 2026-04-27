'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { cn } from '@/shared/ui/primitives/canon';

export type TrustScoreLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface DevCompanyHeaderCompany {
  readonly name: string;
  readonly legalName: string | null;
  readonly taxId: string | null;
  readonly logoUrl: string | null;
  readonly yearsOperating: number | null;
  readonly isVerified: boolean;
}

export interface DevCompanyHeaderTrustScore {
  readonly score: number | null;
  readonly level: TrustScoreLevel | null;
}

export interface DevCompanyHeaderProps {
  readonly company: DevCompanyHeaderCompany;
  readonly trustScore: DevCompanyHeaderTrustScore | null;
  readonly onTrustScoreClick?: () => void;
}

const TRUST_LEVEL_STYLES: Record<TrustScoreLevel, CSSProperties> = {
  bronze: {
    background: 'rgba(180, 83, 9, 0.12)',
    borderColor: 'rgba(180, 83, 9, 0.32)',
    color: '#fdba74',
  },
  silver: {
    background: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.32)',
    color: '#e2e8f0',
  },
  gold: {
    background: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.32)',
    color: '#fcd34d',
  },
  platinum: {
    background: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.32)',
    color: '#c4b5fd',
  },
};

const TRUST_LEVEL_NEUTRAL: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  borderColor: 'rgba(255,255,255,0.10)',
  color: 'var(--canon-cream-2)',
};

function maskTaxId(taxId: string | null): string | null {
  if (!taxId) return null;
  const trimmed = taxId.trim();
  if (trimmed.length <= 4) return trimmed;
  const last4 = trimmed.slice(-4);
  return `••• ${last4}`;
}

function firstLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'D';
  return trimmed.charAt(0).toUpperCase();
}

export function DevCompanyHeader({
  company,
  trustScore,
  onTrustScoreClick,
}: DevCompanyHeaderProps) {
  const t = useTranslations('dev.companyHeader');
  const maskedTaxId = maskTaxId(company.taxId);
  const score = trustScore?.score ?? null;
  const level = trustScore?.level ?? null;
  const trustChipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '9999px',
    border: '1px solid',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '12px',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    cursor: onTrustScoreClick ? 'pointer' : 'default',
    transition:
      'transform var(--canon-duration-fast) var(--canon-ease-out), border-color var(--canon-duration-fast) ease',
    ...(level ? TRUST_LEVEL_STYLES[level] : TRUST_LEVEL_NEUTRAL),
  };

  return (
    <section
      aria-label={t('ariaLabel', { name: company.name })}
      className="flex w-full items-center gap-4 px-6 py-4"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--canon-border)',
        borderRadius: 'var(--canon-radius-card)',
        color: 'var(--canon-cream)',
      }}
    >
      <div
        aria-hidden={company.logoUrl ? undefined : 'true'}
        className="relative flex h-10 w-10 flex-none items-center justify-center overflow-hidden"
        style={{
          borderRadius: '16px',
          background: company.logoUrl
            ? 'rgba(255,255,255,0.04)'
            : 'linear-gradient(135deg, #6366F1, #EC4899)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {company.logoUrl ? (
          <span
            role="img"
            aria-label={t('logoAlt', { name: company.name })}
            className="h-full w-full"
            style={{
              backgroundImage: `url(${company.logoUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <span
            className="text-base font-bold"
            style={{ color: '#fff', fontFamily: 'var(--font-display)' }}
          >
            {firstLetter(company.name)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2
            className="truncate text-base font-semibold"
            style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
          >
            {company.name}
          </h2>
          {company.isVerified ? (
            <span
              role="status"
              className={cn('inline-flex items-center gap-1')}
              style={{
                padding: '3px 10px',
                borderRadius: '9999px',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.32)',
                color: '#86efac',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
              aria-label={t('verifiedLabel')}
              data-testid="company-verified-pill"
            >
              {t('verified')}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {company.legalName ? (
            <span style={{ color: 'var(--canon-cream-2)' }}>{company.legalName}</span>
          ) : null}
          {maskedTaxId ? (
            <span
              style={{ color: 'var(--canon-cream-3)', fontFamily: 'ui-monospace, monospace' }}
              title={t('taxIdLabel')}
            >
              {maskedTaxId}
            </span>
          ) : null}
          {typeof company.yearsOperating === 'number' && company.yearsOperating >= 0 ? (
            <span style={{ color: 'var(--canon-cream-3)' }}>
              {t('yearsOperating', { years: company.yearsOperating })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-none items-center">
        {onTrustScoreClick ? (
          <button
            type="button"
            onClick={onTrustScoreClick}
            style={trustChipStyle}
            aria-label={
              score !== null && level
                ? t('trustScoreAria', { score, level })
                : t('trustScorePendingAria')
            }
          >
            <span style={{ color: 'inherit', opacity: 0.85 }}>{t('trustScoreLabel')}</span>
            {score !== null && level ? (
              <>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{score}</span>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t(`level.${level}`)}
                </span>
              </>
            ) : (
              <span style={{ opacity: 0.85 }}>{t('pending')}</span>
            )}
          </button>
        ) : (
          <span
            style={trustChipStyle}
            role="status"
            aria-label={
              score !== null && level
                ? t('trustScoreAria', { score, level })
                : t('trustScorePendingAria')
            }
          >
            <span style={{ color: 'inherit', opacity: 0.85 }}>{t('trustScoreLabel')}</span>
            {score !== null && level ? (
              <>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{score}</span>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t(`level.${level}`)}
                </span>
              </>
            ) : (
              <span style={{ opacity: 0.85 }}>{t('pending')}</span>
            )}
          </span>
        )}
      </div>
    </section>
  );
}
