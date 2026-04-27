'use client';

// F14.F.5 Sprint 4 UPGRADE 7 LATERAL — DMX Studio Wrapped year-end preview.
// Owned por sub-agent 5. Counter "Tu Wrapped 2026 desbloqueable en X días" + sub-text.
//
// STUB ADR-018 — Vista completa Wrapped (data viz year-in-review) defer H2:
// L-NEW-WRAPPED-YEAR-END-FULL-VIEW. Ejecuta cron diciembre 31 H2.
// H1 sólo counter + nudge generar más videos.
//
// Canon ADR-050: tabular-nums big number + brand gradient hint.
// Strings ES inline (R11). Cero emoji (R6).

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '16px',
  letterSpacing: '-0.005em',
  color: '#FFFFFF',
};

const bigNumberStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '40px',
  letterSpacing: '-0.025em',
  color: 'transparent',
  backgroundImage: 'linear-gradient(90deg, #6366F1, #EC4899)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '13px',
  lineHeight: 1.55,
};

const giftIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="8" width="18" height="13" rx="2" />
    <path d="M3 12h18M12 8v13M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C14 3 12 8 12 8" />
  </svg>
);

function daysUntilDecember31(today: Date = new Date()): number {
  const year = today.getUTCFullYear();
  const target = new Date(Date.UTC(year, 11, 31));
  const ms =
    target.getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function WrappedYearEndPreview() {
  const [days, setDays] = useState<number>(() => daysUntilDecember31());
  useEffect(() => {
    setDays(daysUntilDecember31());
  }, []);

  const statsQuery = trpc.studio.dashboard.getStats.useQuery();
  const totalVideos = useMemo(() => {
    const data = statsQuery.data as { videosThisMonth?: number } | undefined;
    return data?.videosThisMonth ?? 0;
  }, [statsQuery.data]);

  const year = new Date().getUTCFullYear();

  return (
    <Card
      variant="recessed"
      className="flex flex-col gap-3 p-5"
      role="region"
      aria-label="Vista previa Wrapped de fin de año"
      data-testid="studio-wrapped-year-end-preview"
    >
      <div className="flex items-center gap-3">
        <IconCircle tone="rose" size="sm" icon={giftIcon} />
        <h3 style={titleStyle}>Tu Wrapped {year}</h3>
        <DisclosurePill tone="rose">Próximamente</DisclosurePill>
      </div>
      <div className="flex items-baseline gap-2">
        <span style={bigNumberStyle} data-testid="studio-wrapped-days">
          {days}
        </span>
        <span style={{ color: 'var(--canon-cream-2)', fontSize: '13px' }}>
          días para desbloquearlo
        </span>
      </div>
      <p style={subtitleStyle}>
        Llevas {totalVideos} videos este mes. Sigue construyendo tu year-in-review: cuanto más
        crees, mejor será tu Wrapped al cierre del año.
      </p>
    </Card>
  );
}
