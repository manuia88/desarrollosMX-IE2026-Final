'use client';

// F14.F.5 Sprint 4 — Tarea 4.2 BIBLIA: Generar desde calendario.
// Click "Generar ahora" navega /studio-app/projects/new?calendarEntryId=...&prefillType=...
// Display día + tipo + título + descripción + smart timing + mood.

import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useCallback } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, IconCircle } from '@/shared/ui/primitives/canon';

export interface DayDetailModalProps {
  readonly locale: string;
  readonly date: string; // YYYY-MM-DD
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSkip: (entryId: string) => void;
  readonly testId?: string;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(6, 8, 15, 0.78)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
  padding: '16px',
};

const modalStyle: CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border-2)',
  boxShadow: 'var(--shadow-canon-spotlight)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const labelStyle: CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--canon-cream-2)',
};

const valueStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--canon-cream)',
  lineHeight: 1.5,
};

function topicKindToProjectType(kind: string): 'standard' | 'paseo' | 'wrapped' {
  if (kind === 'zona') return 'paseo';
  if (kind === 'remarketing') return 'wrapped';
  return 'standard';
}

const sparkleIcon = (
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
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  </svg>
);

export function DayDetailModal({
  locale,
  date,
  open,
  onClose,
  onSkip,
  testId,
}: DayDetailModalProps) {
  const router = useRouter();
  const dayQuery = trpc.studio.calendar.getDaySuggestion.useQuery({ date }, { enabled: open });

  const handleGenerateNow = useCallback(() => {
    const entry = dayQuery.data?.entry;
    if (!entry) return;
    const prefillType = topicKindToProjectType(entry.topicKind);
    const target = `/${locale}/studio-app/projects/new?calendarEntryId=${entry.id}&prefillType=${prefillType}`;
    router.push(target);
  }, [dayQuery.data, locale, router]);

  const handleSkip = useCallback(() => {
    const entry = dayQuery.data?.entry;
    if (!entry) {
      onClose();
      return;
    }
    onSkip(entry.id);
  }, [dayQuery.data, onClose, onSkip]);

  if (!open) return null;

  const data = dayQuery.data;
  const entry = data?.entry ?? null;
  const smartTiming = data?.smartTiming ?? null;
  const mood = data?.mood ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del dia ${date}`}
      style={overlayStyle}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      data-testid={testId ?? 'studio-calendar-day-detail-modal'}
    >
      <Card
        variant="elevated"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        data-testid="studio-calendar-day-detail-card"
      >
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconCircle tone="violet" size="md" icon={sparkleIcon} />
            <div className="flex flex-col">
              <span style={labelStyle}>Sugerencia del dia</span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: 'var(--canon-cream)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {date}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="h-8 w-8 rounded-full"
            style={{
              background: 'transparent',
              border: '1px solid var(--canon-border-2)',
              color: 'var(--canon-cream-2)',
              cursor: 'pointer',
            }}
          >
            x
          </button>
        </header>

        {dayQuery.isLoading ? (
          <div
            aria-hidden="true"
            style={{
              height: '120px',
              borderRadius: 'var(--canon-radius-inner)',
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
            }}
          />
        ) : entry ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span style={labelStyle}>Tipo</span>
              <span style={valueStyle}>
                {entry.topicKind} · {entry.channel} · {entry.contentType}
              </span>
            </div>
            {entry.topic ? (
              <div className="flex flex-col gap-1">
                <span style={labelStyle}>Titulo sugerido</span>
                <span style={valueStyle}>{entry.topic}</span>
              </div>
            ) : null}
            {entry.notes ? (
              <div className="flex flex-col gap-1">
                <span style={labelStyle}>Descripcion</span>
                <span style={valueStyle}>{entry.notes}</span>
              </div>
            ) : null}
            {smartTiming ? (
              <div className="flex flex-col gap-1">
                <span style={labelStyle}>Smart timing</span>
                <span style={valueStyle}>
                  {String(smartTiming.hour).padStart(2, '0')}:00 · {smartTiming.reason}
                </span>
              </div>
            ) : null}
            {mood ? (
              <div className="flex flex-col gap-1">
                <span style={labelStyle}>Mood semana</span>
                <span style={valueStyle}>{mood}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span style={valueStyle}>No hay sugerencia para este dia.</span>
            <span style={{ ...valueStyle, color: 'var(--canon-cream-2)' }}>
              Genera el calendario del mes para recibir sugerencias.
            </span>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="glass"
            size="md"
            onClick={onClose}
            data-testid="studio-calendar-day-close-btn"
          >
            Cerrar
          </Button>
          {entry ? (
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={handleSkip}
                data-testid="studio-calendar-day-skip-btn"
              >
                Omitir dia
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleGenerateNow}
                data-testid="studio-calendar-day-generate-btn"
              >
                Generar ahora
              </Button>
            </>
          ) : null}
        </footer>
      </Card>
    </div>
  );
}
