'use client';

// F14.F.5 Sprint 4 — Tarea 4.1 calendario IA mensual grid 7 columnas.
// Color tints canon ADR-050 per topicKind (5 wayfinding):
//   marca=violet, propiedad=indigo, zona=teal, remarketing=amber, email=rose.
// Hover smart timing chip (UPGRADE 4 DIRECTO).

import type { CSSProperties } from 'react';
import { useCallback, useMemo } from 'react';
import type {
  CalendarChannel,
  CalendarDayEntry,
  CalendarStatus,
  CalendarTopicKind,
} from '@/features/dmx-studio/lib/calendar/types';
import { Card } from '@/shared/ui/primitives/canon';

export interface CalendarMonthViewProps {
  readonly monthDate: string; // YYYY-MM-01
  readonly entries: ReadonlyArray<CalendarDayEntry>;
  readonly onDayClick: (date: string) => void;
  readonly testId?: string;
}

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'] as const;

const TOPIC_TINTS: Record<CalendarTopicKind, { bg: string; border: string; text: string }> = {
  marca: {
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.32)',
    text: 'var(--accent-violet)',
  },
  propiedad: {
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.32)',
    text: 'var(--canon-indigo-2)',
  },
  zona: {
    bg: 'rgba(20, 184, 166, 0.12)',
    border: 'rgba(20, 184, 166, 0.32)',
    text: 'var(--accent-teal)',
  },
  remarketing: {
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.34)',
    text: 'var(--canon-amber)',
  },
  email: {
    bg: 'rgba(236, 72, 153, 0.12)',
    border: 'rgba(236, 72, 153, 0.32)',
    text: 'var(--canon-rose)',
  },
};

const STATUS_DOT: Record<CalendarStatus, string> = {
  planned: 'var(--canon-cream-3)',
  scheduled: 'var(--canon-indigo-2)',
  published: 'var(--canon-green)',
  skipped: 'var(--canon-cream-3)',
  failed: 'var(--canon-red)',
};

const CHANNEL_LABEL: Record<CalendarChannel, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
  wa_status: 'WA',
  linkedin: 'LI',
  email: 'EM',
  blog: 'BL',
};

interface MonthGridDay {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
}

function buildMonthGrid(monthDate: string): MonthGridDay[] {
  const [year, month] = monthDate.split('-').map(Number);
  if (!year || !month) return [];
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const lastOfMonth = new Date(Date.UTC(year, month, 0));
  const daysInMonth = lastOfMonth.getUTCDate();

  const today = new Date();
  const todayIso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(today.getUTCDate()).padStart(2, '0')}`;

  const cells: MonthGridDay[] = [];
  // Padding pre-mes
  for (let i = 0; i < startWeekday; i += 1) {
    const padDate = new Date(Date.UTC(year, month - 1, 1 - (startWeekday - i)));
    const d = `${padDate.getUTCFullYear()}-${String(padDate.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}-${String(padDate.getUTCDate()).padStart(2, '0')}`;
    cells.push({ date: d, dayNumber: padDate.getUTCDate(), inMonth: false, isToday: false });
  }
  // Dias del mes
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ date: d, dayNumber: day, inMonth: true, isToday: d === todayIso });
  }
  // Padding post-mes para llegar a 35 o 42
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    if (!last) break;
    const [ly, lm, ld] = last.date.split('-').map(Number);
    if (!ly || !lm || !ld) break;
    const next = new Date(Date.UTC(ly, lm - 1, ld + 1));
    const d = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}-${String(next.getUTCDate()).padStart(2, '0')}`;
    cells.push({ date: d, dayNumber: next.getUTCDate(), inMonth: false, isToday: false });
  }
  return cells;
}

const headerStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--canon-cream-2)',
  padding: '8px 6px',
  textAlign: 'center',
};

export function CalendarMonthView({
  monthDate,
  entries,
  onDayClick,
  testId,
}: CalendarMonthViewProps) {
  const grid = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarDayEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.scheduledFor) ?? [];
      list.push(entry);
      map.set(entry.scheduledFor, list);
    }
    return map;
  }, [entries]);

  const handleClick = useCallback(
    (date: string) => {
      onDayClick(date);
    },
    [onDayClick],
  );

  return (
    <Card
      variant="elevated"
      className="flex flex-col gap-2 p-4"
      data-testid={testId ?? 'studio-calendar-month-view'}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid pattern intentional for clickable day cells (no real tabular data semantics). */}
      <div
        className="grid grid-cols-7 gap-2"
        role="grid"
        aria-label="Calendario mensual de contenido"
      >
        {WEEKDAY_LABELS.map((label) => (
          // biome-ignore lint/a11y/useSemanticElements: paired with grid above for ARIA grid pattern.
          // biome-ignore lint/a11y/useFocusableInteractive: header labels are static, focus moves to gridcell buttons.
          <div key={label} role="columnheader" style={headerStyle}>
            {label}
          </div>
        ))}
        {grid.map((cell) => {
          const dayEntries = entriesByDate.get(cell.date) ?? [];
          const cellStyle: CSSProperties = {
            background: cell.inMonth ? 'var(--surface-recessed)' : 'transparent',
            border: '1px solid var(--canon-border)',
            borderRadius: 'var(--canon-radius-inner)',
            padding: '8px',
            minHeight: '92px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            cursor: cell.inMonth ? 'pointer' : 'default',
            opacity: cell.inMonth ? 1 : 0.35,
            transition:
              'transform var(--canon-duration-fast) var(--canon-ease-out), border-color var(--canon-duration-fast) ease',
            outline: cell.isToday ? '1px solid var(--canon-indigo-2)' : 'none',
          };
          return (
            // biome-ignore lint/a11y/useSemanticElements: button with role="gridcell" within ARIA grid pattern (paired with parent grid).
            <button
              key={cell.date}
              type="button"
              role="gridcell"
              aria-label={`Dia ${cell.dayNumber}${
                dayEntries.length > 0 ? `, ${dayEntries.length} entradas` : ''
              }`}
              onClick={cell.inMonth ? () => handleClick(cell.date) : undefined}
              disabled={!cell.inMonth}
              style={cellStyle}
              data-date={cell.date}
              data-testid={`studio-calendar-day-${cell.date}`}
              className="canon-card-hoverable text-left"
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: cell.inMonth ? 'var(--canon-cream)' : 'var(--canon-cream-3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {cell.dayNumber}
              </span>
              {dayEntries.slice(0, 3).map((entry) => {
                const tint = TOPIC_TINTS[entry.topicKind];
                return (
                  <span
                    key={entry.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 8px',
                      borderRadius: 'var(--canon-radius-chip)',
                      background: tint.bg,
                      border: `1px solid ${tint.border}`,
                      color: tint.text,
                      fontSize: '10.5px',
                      fontWeight: 600,
                    }}
                    title={
                      entry.scheduledTime
                        ? `${entry.scheduledTime} · ${entry.topicKind}`
                        : entry.topicKind
                    }
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '9999px',
                        background: STATUS_DOT[entry.status],
                      }}
                    />
                    {CHANNEL_LABEL[entry.channel]}
                    {entry.scheduledTime ? ` · ${entry.scheduledTime.slice(0, 5)}` : ''}
                  </span>
                );
              })}
              {dayEntries.length > 3 ? (
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--canon-cream-2)',
                    fontWeight: 600,
                  }}
                >
                  +{dayEntries.length - 3} mas
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
