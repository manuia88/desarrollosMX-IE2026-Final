'use client';

// F14.F.5 Sprint 4 UPGRADE 2 DIRECTO — DMX Studio sugerencias proactivas dashboard banner.
// Owned por sub-agent 5. Consume tRPC studio.calendar.getDaySuggestion (existirá una vez
// sub-agent 1 termina). Si query falla / está vacía → render fallback texto graceful.
//
// Canon ADR-050: heading + breath glow opcional + brand gradient firma.
// Strings ES inline (R11). Pill button (R8). translateY-only (R7). Cero emoji (R6).

import { useRouter } from 'next/navigation';
import { type CSSProperties, useCallback, useMemo } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

export interface ProactiveSuggestionBannerProps {
  readonly locale: string;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '18px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '13.5px',
  lineHeight: 1.5,
};

const dayLabelStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 600,
};

const calendarIcon = (
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

export function ProactiveSuggestionBanner({ locale }: ProactiveSuggestionBannerProps) {
  const router = useRouter();
  const today = useMemo(() => todayDateUtc(), []);

  // Calendar router (sub-agent 1) shipped: getDaySuggestion always exists.
  // Graceful degradation: si query devuelve isError o entry===null → render nothing.
  type SuggestionResult = {
    data?: {
      entry: { contentType?: string | null; channel?: string | null; topic?: string | null } | null;
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
  const dayLabel = dayLabelEs(today);

  return (
    <Card
      variant="spotlight"
      className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Sugerencia proactiva del calendario"
      data-testid="studio-proactive-suggestion-banner"
    >
      <div className="flex items-start gap-4">
        <IconCircle tone="indigo" size="lg" icon={calendarIcon} />
        <div className="flex flex-col gap-1.5">
          <span style={dayLabelStyle}>{dayLabel}</span>
          <div className="flex flex-wrap items-center gap-2">
            <h2 style={titleStyle}>Hoy te toca un {contentType}</h2>
            <DisclosurePill tone="indigo">Calendario</DisclosurePill>
          </div>
          <p style={subtitleStyle}>
            {topic ? `Tema sugerido: ${topic}.` : null} {channel ? `Canal: ${channel}.` : null}{' '}
            Genera tu video en 3 clics y mantén tu racha.
          </p>
        </div>
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={handleGenerate}
        aria-label="Generar video sugerido en 3 clics"
        data-testid="studio-proactive-suggestion-cta"
      >
        Generar ahora en 3 clics
      </Button>
    </Card>
  );
}
