'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon/card';

const headingStyle: CSSProperties = {
  color: 'var(--canon-white-pure)',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: '-0.005em',
};

const linkStyle: CSSProperties = {
  color: '#c7d2fe',
  fontFamily: 'var(--font-body)',
  fontSize: 12.5,
  fontWeight: 600,
};

const labelStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: 11.5,
  fontWeight: 500,
};

const valueStyle: CSSProperties = {
  color: 'var(--canon-white-pure)',
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 22,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
};

export interface MarketingTodayWidgetProps {
  locale: string;
}

export function MarketingTodayWidget({ locale }: MarketingTodayWidgetProps) {
  const t = useTranslations('Marketing');
  const stats = trpc.marketing.getDashboardStats.useQuery();
  const href = `/${locale}/asesores/marketing`;

  return (
    <Card variant="default" className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 style={headingStyle}>{t('widget.title')}</h2>
        <Link href={href} style={linkStyle} aria-label={t('widget.viewAllAria')}>
          {t('widget.viewAll')}
        </Link>
      </div>

      {stats.isLoading ? (
        <p style={{ color: 'var(--canon-cream-2)', fontSize: 12.5 }}>{t('common.loading')}</p>
      ) : !stats.data ||
        (stats.data.publishedLandings === 0 &&
          stats.data.totalScans === 0 &&
          stats.data.visits30d === 0 &&
          stats.data.leads30d === 0) ? (
        <div className="flex flex-col gap-2">
          <p
            style={{
              color: 'var(--canon-cream-2)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
            }}
          >
            {t('widget.empty')}
          </p>
          <Link href={href} style={linkStyle}>
            {t('widget.emptyCta')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span style={labelStyle}>{t('widget.kpis.landings')}</span>
            <span style={valueStyle}>{stats.data.publishedLandings}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span style={labelStyle}>{t('widget.kpis.scans')}</span>
            <span style={valueStyle}>{stats.data.totalScans}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span style={labelStyle}>{t('widget.kpis.visits')}</span>
            <span style={valueStyle}>{stats.data.visits30d}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span style={labelStyle}>{t('widget.kpis.leads')}</span>
            <span style={valueStyle}>{stats.data.leads30d}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
