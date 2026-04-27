'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export interface PendientesListProps {
  readonly pendientes: {
    readonly documents: {
      readonly count: number;
      readonly latest: ReadonlyArray<{
        readonly id: string;
        readonly nombre: string;
        readonly tipo: string;
        readonly created_at: string;
      }>;
    };
    readonly landings: {
      readonly count: number;
    };
    readonly cfdis: {
      readonly count: number;
    };
  };
}

type RowKey = 'documents' | 'landings' | 'cfdis';

interface RowConfig {
  readonly key: RowKey;
  readonly count: number;
  readonly href: string;
}

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' });

const DATE_FORMATTER = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
});

function relativeFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) >= 7) {
    return DATE_FORMATTER.format(date);
  }
  return RELATIVE_FORMATTER.format(diffDays, 'day');
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--canon-cream-2)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 0',
  borderBottom: '1px solid var(--canon-border-2)',
};

const rowLastStyle: CSSProperties = {
  ...rowStyle,
  borderBottom: 'none',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  color: 'var(--canon-cream)',
};

const countStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--canon-cream)',
  lineHeight: 1,
};

const emptyStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  color: 'var(--canon-cream-3)',
  fontStyle: 'italic',
};

const stubBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 9999,
  fontFamily: 'var(--font-body)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  background: 'rgba(148, 163, 184, 0.18)',
  color: 'var(--canon-cream-3)',
  border: '1px solid var(--canon-border-2)',
};

const linkStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  color: 'var(--canon-cream-3)',
  pointerEvents: 'none',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const subListStyle: CSSProperties = {
  margin: '6px 0 0 0',
  padding: 0,
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const subItemStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  color: 'var(--canon-cream-2)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
};

export function PendientesList({ pendientes }: PendientesListProps): React.ReactElement {
  const t = useTranslations('dev.pendientes');

  const rows: ReadonlyArray<RowConfig> = [
    {
      key: 'documents',
      count: pendientes.documents.count,
      // STUB ADR-018 documents — activar FASE 15
      href: '/desarrolladores/inventario/documentos',
    },
    {
      key: 'landings',
      count: pendientes.landings.count,
      // STUB ADR-018 landings — activar FASE 15
      href: '/desarrolladores/marketing/landings',
    },
    {
      key: 'cfdis',
      count: pendientes.cfdis.count,
      // STUB ADR-018 cfdis — activar FASE 15
      href: '/desarrolladores/contabilidad/cfdis',
    },
  ];

  const latestDocs = pendientes.documents.latest.slice(0, 3);

  return (
    <Card
      variant="elevated"
      style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}
      aria-label={t('title')}
    >
      <h3 style={titleStyle}>{t('title')}</h3>

      {rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        const showSubList = row.key === 'documents' && row.count > 0 && latestDocs.length > 0;
        return (
          <div key={row.key} style={isLast ? rowLastStyle : rowStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                  }}
                >
                  {row.count > 0 ? <span style={countStyle}>{row.count}</span> : null}
                  <span style={row.count > 0 ? labelStyle : emptyStyle}>
                    {row.count > 0 ? t(`labels.${row.key}`) : t('empty')}
                  </span>
                </div>
                <a
                  href={row.href}
                  aria-disabled="true"
                  tabIndex={-1}
                  data-stub-href={row.href}
                  style={linkStyle}
                  onClick={(event) => {
                    event.preventDefault();
                  }}
                >
                  <span style={stubBadgeStyle}>{t('comingSoon')}</span>
                </a>
              </div>
              {showSubList ? (
                <ul style={subListStyle}>
                  {latestDocs.map((doc) => (
                    <li key={doc.id} style={subItemStyle}>
                      <span>
                        <strong style={{ color: 'var(--canon-cream)' }}>{doc.nombre}</strong>
                        <span style={{ marginLeft: 6, color: 'var(--canon-cream-3)' }}>
                          {doc.tipo}
                        </span>
                      </span>
                      <span style={{ color: 'var(--canon-cream-3)' }}>
                        {relativeFromIso(doc.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
