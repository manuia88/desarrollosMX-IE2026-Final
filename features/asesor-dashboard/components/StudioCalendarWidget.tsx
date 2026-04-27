'use client';

// F14.F.5 Sprint 4 UPGRADE 9 CROSS-FN — M01 Dashboard Studio Calendar widget.
// Owned por sub-agent 5. Conditional render: si user es Studio active (subscriptions
// status='active' o 'trialing') AND tiene calendar generado este mes → display today
// suggestion + CTA "Generar". Si no Studio active → return null.
//
// NOTA PM: este componente es standalone. No se inserta automáticamente en
// AsesorDashboardLayout. PM insertion punto: ver REPORTE FINAL.
//
// Canon ADR-050 hybrid panel: Card spotlight + AI gradient signal cuando IA generated.
// Strings ES inline (R11). Pill button (R8). translateY-only (R7). Cero emoji (R6).

import { useRouter } from 'next/navigation';
import { type CSSProperties, useCallback, useMemo } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

export interface StudioCalendarWidgetProps {
  readonly locale: string;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '16px',
  letterSpacing: '-0.005em',
  color: 'var(--canon-white-pure, #FFFFFF)',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '13px',
  lineHeight: 1.5,
};

const dayLabelStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '11.5px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 600,
};

const calendarIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 11h18" />
  </svg>
);

function todayDateUtc(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DAY_LABELS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

function dayLabelEs(date: string): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return '';
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return DAY_LABELS_ES[dt.getUTCDay()] ?? '';
}

export function StudioCalendarWidget({ locale }: StudioCalendarWidgetProps) {
  const router = useRouter();
  const today = useMemo(() => todayDateUtc(), []);

  // Discovery: Studio active = tiene subscription status='active' o 'trialing'.
  // Reusamos studio.dashboard.getStats que ya consulta studio_subscriptions y devuelve
  // null safe shape si no hay subscription (videosLimit=0 indica no Studio activo).
  const statsQuery = trpc.studio.dashboard.getStats.useQuery(undefined, {
    retry: false,
  });

  // Calendar getDaySuggestion (sub-agent 1). Graceful degrade vía isError flag.
  type SuggestionResult = {
    data?: {
      entry: {
        contentType?: string | null;
        channel?: string | null;
        topic?: string | null;
        aiGenerated?: boolean;
      } | null;
    };
    isLoading: boolean;
    isError: boolean;
  };

  const calendarHook = (
    trpc as unknown as {
      studio: {
        calendar: {
          getDaySuggestion: {
            useQuery: (input: { date: string }, opts?: unknown) => SuggestionResult;
          };
        };
      };
    }
  ).studio.calendar.getDaySuggestion.useQuery;

  const suggestionQuery: SuggestionResult = calendarHook({ date: today }, { retry: false });

  const handleGenerate = useCallback(() => {
    router.push(`/${locale}/studio-app/projects/new?prefillFromDailySuggestion=true`);
  }, [router, locale]);

  const stats = statsQuery.data as { videosLimit?: number } | undefined;
  const isStudioActive = (stats?.videosLimit ?? 0) > 0;

  if (statsQuery.isLoading || !isStudioActive) {
    return null;
  }
  if (suggestionQuery.isLoading) {
    return null;
  }
  if (suggestionQuery.isError || !suggestionQuery.data?.entry) {
    return null;
  }

  const entry = suggestionQuery.data.entry;
  const contentType = entry.contentType ?? 'reel';
  const channel = entry.channel ?? '';
  const topic = entry.topic ?? '';
  const isAi = Boolean(entry.aiGenerated);
  const dayLabel = dayLabelEs(today);

  return (
    <Card
      variant={isAi ? 'glow' : 'spotlight'}
      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Studio · Calendario de hoy"
      data-testid="asesor-studio-calendar-widget"
    >
      <div className="flex items-start gap-3">
        <IconCircle tone={isAi ? 'violet' : 'indigo'} size="md" icon={calendarIcon} />
        <div className="flex flex-col gap-1">
          <span style={dayLabelStyle}>{dayLabel} · Studio</span>
          <div className="flex flex-wrap items-center gap-2">
            <h3 style={titleStyle}>Hoy te toca un {contentType}</h3>
            {isAi ? <DisclosurePill tone="violet">IA</DisclosurePill> : null}
          </div>
          <p style={subtitleStyle}>
            {topic ? `Tema: ${topic}.` : null} {channel ? `Canal: ${channel}.` : null}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="md"
        onClick={handleGenerate}
        aria-label="Generar video del día en Studio"
        data-testid="asesor-studio-calendar-cta"
      >
        Generar
      </Button>
    </Card>
  );
}
