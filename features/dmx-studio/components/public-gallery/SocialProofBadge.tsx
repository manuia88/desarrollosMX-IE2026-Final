// F14.F.8 Sprint 7 BIBLIA Upgrade 6 — Public gallery analytics shared (social proof).

import type { CSSProperties } from 'react';

interface Props {
  readonly viewsLast30d: number;
  readonly leadsLast30d: number;
  readonly totalViews: number;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  justifyContent: 'center',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: '9999px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  fontSize: '13px',
  color: 'var(--canon-cream)',
};

export function SocialProofBadge({ viewsLast30d, leadsLast30d, totalViews }: Props) {
  if (viewsLast30d === 0 && leadsLast30d === 0 && totalViews === 0) return null;
  return (
    <section style={containerStyle} aria-label="Estadísticas públicas">
      {viewsLast30d > 0 ? (
        <span style={badgeStyle}>Visto {viewsLast30d.toLocaleString('es-MX')} veces este mes</span>
      ) : null}
      {leadsLast30d > 0 ? (
        <span style={badgeStyle}>{leadsLast30d} contacto(s) recientes</span>
      ) : null}
      {totalViews > 0 ? (
        <span style={badgeStyle}>{totalViews.toLocaleString('es-MX')} visitas totales</span>
      ) : null}
    </section>
  );
}
