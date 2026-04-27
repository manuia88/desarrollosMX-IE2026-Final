'use client';

// F14.F.5 Sprint 4 — Calendar IA orchestrator (Tareas 4.1 + 4.2 + UPGRADES 1+4).
// Consume tRPC studio.calendar.{getMonth, generateMonth, getDaySuggestion, markAsGenerated, previewMood}.
// Mes actual default. Renders CalendarMonthView + MoodIndicator + DayDetailModal.

import type { CSSProperties } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { Mood } from '@/features/dmx-studio/lib/calendar/types';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button } from '@/shared/ui/primitives/canon';
import { CalendarMonthView } from './CalendarMonthView';
import { DayDetailModal } from './DayDetailModal';
import { MoodIndicator } from './MoodIndicator';

export interface CalendarPageProps {
  readonly locale: string;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
};

const errorStyle: CSSProperties = {
  background: 'rgba(239, 68, 68, 0.10)',
  border: '1px solid rgba(239, 68, 68, 0.40)',
  color: 'var(--canon-red)',
  padding: '12px 16px',
  borderRadius: 'var(--canon-radius-inner)',
  fontSize: '13px',
};

function currentMonthIso(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function shiftMonth(monthDate: string, delta: number): string {
  const [year, month] = monthDate.split('-').map(Number);
  if (!year || !month) return monthDate;
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function formatMonthLabel(monthDate: string): string {
  const [year, month] = monthDate.split('-').map(Number);
  if (!year || !month) return monthDate;
  const labels = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  const monthLabel = labels[month - 1] ?? String(month);
  return `${monthLabel} ${year}`;
}

export function CalendarPage({ locale }: CalendarPageProps) {
  const [monthDate, setMonthDate] = useState<string>(currentMonthIso());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const monthQuery = trpc.studio.calendar.getMonth.useQuery({ monthDate });
  const moodPreviewQuery = trpc.studio.calendar.previewMood.useQuery();
  const utils = trpc.useUtils();
  const generateMonth = trpc.studio.calendar.generateMonth.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await utils.studio.calendar.getMonth.invalidate({ monthDate });
    },
    onError: (err) => {
      setErrorMessage(err.message);
    },
  });
  const markAsGenerated = trpc.studio.calendar.markAsGenerated.useMutation();

  const entries = useMemo(() => monthQuery.data?.entries ?? [], [monthQuery.data]);
  const mood: Mood | null = monthQuery.data?.mood ?? moodPreviewQuery.data?.mood ?? null;
  const toneHint = monthQuery.data?.toneHint ?? moodPreviewQuery.data?.toneHint ?? null;

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const handleSkip = useCallback(
    async (_entryId: string) => {
      // Skip simplemente cierra el modal por ahora; backend skip handler shipped Sprint 5.
      // markAsGenerated mutation se reserva para flujo "Generar ahora" → project_id link.
      void markAsGenerated;
      setSelectedDate(null);
    },
    [markAsGenerated],
  );

  const handleGenerate = useCallback(() => {
    setErrorMessage(null);
    generateMonth.mutate({ monthDate });
  }, [generateMonth, monthDate]);

  const handlePrevMonth = useCallback(() => {
    setMonthDate((prev) => shiftMonth(prev, -1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonthDate((prev) => shiftMonth(prev, 1));
  }, []);

  const isLoading = monthQuery.isLoading;
  const isGenerating = generateMonth.isPending;

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FadeUp delay={0}>
          <div className="flex flex-col gap-2">
            <h1 style={headingStyle}>Calendario IA</h1>
            <p style={subtitleStyle}>
              Plan mensual generado por IA con mood detection y mejores horas por canal.
            </p>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex flex-wrap items-center gap-2">
            {mood ? <MoodIndicator mood={mood} toneHint={toneHint} /> : null}
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerate}
              disabled={isGenerating}
              data-testid="studio-calendar-generate-btn"
              aria-label={isGenerating ? 'Generando calendario' : 'Generar mes con IA'}
            >
              {isGenerating ? 'Generando...' : 'Generar mes con IA'}
            </Button>
          </div>
        </FadeUp>
      </header>

      <FadeUp delay={0.15}>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={handlePrevMonth}
            data-testid="studio-calendar-prev-month"
            aria-label="Mes anterior"
          >
            Anterior
          </Button>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '18px',
              color: 'var(--canon-cream)',
              textTransform: 'capitalize',
            }}
          >
            {formatMonthLabel(monthDate)}
          </span>
          <Button
            variant="glass"
            size="sm"
            onClick={handleNextMonth}
            data-testid="studio-calendar-next-month"
            aria-label="Mes siguiente"
          >
            Siguiente
          </Button>
        </div>
      </FadeUp>

      {errorMessage ? (
        <div role="alert" style={errorStyle} data-testid="studio-calendar-error">
          {errorMessage}
        </div>
      ) : null}

      <FadeUp delay={0.2}>
        {isLoading ? (
          <div
            aria-hidden="true"
            style={{
              height: '480px',
              borderRadius: 'var(--canon-radius-card)',
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
            }}
          />
        ) : (
          <CalendarMonthView monthDate={monthDate} entries={entries} onDayClick={handleDayClick} />
        )}
      </FadeUp>

      {selectedDate ? (
        <DayDetailModal
          locale={locale}
          date={selectedDate}
          open={selectedDate !== null}
          onClose={handleClose}
          onSkip={handleSkip}
        />
      ) : null}
    </>
  );
}
