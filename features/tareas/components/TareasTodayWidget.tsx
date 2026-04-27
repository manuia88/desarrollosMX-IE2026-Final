'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { TareaCardData } from '@/features/tareas/types';
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

const itemTitleStyle: CSSProperties = {
  color: 'var(--canon-white-pure)',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 13,
  lineHeight: 1.3,
};

const itemMetaStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: 11.5,
  fontVariantNumeric: 'tabular-nums',
};

export interface TareasTodayWidgetProps {
  locale: string;
  hrefList?: string;
}

export function TareasTodayWidget({ locale, hrefList }: TareasTodayWidgetProps) {
  const t = useTranslations('Tareas');
  const formatter = useFormatter();
  const query = trpc.tareas.listTareas.useQuery({ scope: 'today', teamView: false, limit: 5 });

  const allItems: TareaCardData[] = query.data
    ? [
        ...query.data.propiedades,
        ...query.data.clientes,
        ...query.data.prospectos,
        ...query.data.general,
      ]
    : [];
  const top = allItems.slice(0, 5);
  const href = hrefList ?? `/${locale}/asesores/tareas`;

  return (
    <Card variant="default" className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 style={headingStyle}>{t('widget.title')}</h2>
        <Link href={href} style={linkStyle} aria-label={t('widget.viewAllAria')}>
          {t('widget.viewAll')}
        </Link>
      </div>
      {query.isLoading ? (
        <p style={{ color: 'var(--canon-cream-2)', fontSize: 12.5 }}>{t('widget.loading')}</p>
      ) : top.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p
            style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)', fontSize: 13 }}
          >
            {t('widget.empty')}
          </p>
          <Link href={href} style={linkStyle}>
            {t('widget.emptyCta')}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {top.map((tarea) => {
            let metaLabel = '';
            try {
              metaLabel = formatter.dateTime(new Date(tarea.dueAt), {
                hour: '2-digit',
                minute: '2-digit',
              });
            } catch {
              metaLabel = tarea.dueAt;
            }
            return (
              <li
                key={tarea.id}
                className="flex items-center justify-between gap-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 'var(--canon-radius-card)',
                  padding: '10px 12px',
                }}
              >
                <span style={itemTitleStyle}>{tarea.title}</span>
                <span style={itemMetaStyle}>{metaLabel}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
