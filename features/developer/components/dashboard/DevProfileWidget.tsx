'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

export type DevProfileWidgetProps = {
  readonly company: {
    readonly name: string;
    readonly legalName: string | null;
    readonly taxId: string | null;
    readonly logoUrl: string | null;
    readonly yearsOperating: number | null;
    readonly isVerified: boolean;
  };
  readonly projectsActive: number | null;
};

function censorRfc(rfc: string | null): string | null {
  if (!rfc) return null;
  const trimmed = rfc.trim();
  if (trimmed.length <= 4) return `••• ${trimmed}`;
  return `••• ${trimmed.slice(-4)}`;
}

export function DevProfileWidget({ company, projectsActive }: DevProfileWidgetProps) {
  const t = useTranslations('dev.dashboard.profileWidget');
  const rfc = censorRfc(company.taxId);

  return (
    <Card className="flex flex-col gap-3 p-6">
      <header className="flex items-center gap-3">
        {company.logoUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar opaque url, no Next/Image config required
          <img
            src={company.logoUrl}
            alt=""
            className="h-12 w-12 rounded-xl object-cover"
            aria-hidden="true"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #EC4899)',
              color: '#fff',
            }}
            aria-hidden="true"
          >
            {company.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: 'var(--canon-cream)' }}>
            {company.name}
          </span>
          {company.legalName ? (
            <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
              {company.legalName}
            </span>
          ) : null}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {t('rfc')}
          </dt>
          <dd
            className="mt-1 font-medium"
            style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}
          >
            {rfc ?? t('notProvided')}
          </dd>
        </div>
        <div>
          <dt
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {t('yearsOperating')}
          </dt>
          <dd
            className="mt-1 font-medium"
            style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}
          >
            {company.yearsOperating === null
              ? '—'
              : t('yearsValue', { count: company.yearsOperating })}
          </dd>
        </div>
        <div>
          <dt
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {t('projectsActive')}
          </dt>
          <dd
            className="mt-1 font-medium"
            style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}
          >
            {projectsActive ?? '—'}
          </dd>
        </div>
        <div>
          <dt
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {t('verified')}
          </dt>
          <dd className="mt-1 font-medium">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
              style={{
                background: company.isVerified ? 'rgba(52,211,153,0.18)' : 'rgba(148,163,184,0.18)',
                color: company.isVerified ? '#34d399' : 'var(--canon-cream-2)',
              }}
            >
              {company.isVerified ? t('verifiedYes') : t('verifiedNo')}
            </span>
          </dd>
        </div>
      </dl>
    </Card>
  );
}
