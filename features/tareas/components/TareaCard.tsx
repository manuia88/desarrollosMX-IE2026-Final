'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { type CSSProperties, useMemo } from 'react';
import type { TareaCardData } from '@/features/tareas/types';
import { Card } from '@/shared/ui/primitives/canon/card';
import { cn } from '@/shared/ui/primitives/canon/cn';

const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  alta: { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.40)', text: '#fca5a5' },
  media: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.40)', text: '#fde68a' },
  baja: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.40)', text: '#86efac' },
};

export interface TareaCardProps {
  tarea: TareaCardData;
  onComplete: (id: string) => void;
  isCompleting?: boolean;
}

export function TareaCard({ tarea, onComplete, isCompleting }: TareaCardProps) {
  const t = useTranslations('Tareas');
  const formatter = useFormatter();
  const locale = useLocale();

  const expired = tarea.status === 'expired';
  const done = tarea.status === 'done';

  const daysOverdue = useMemo(() => {
    if (!expired) return 0;
    const due = new Date(tarea.dueAt).getTime();
    const now = Date.now();
    return Math.max(1, Math.floor((now - due) / (1000 * 60 * 60 * 24)));
  }, [expired, tarea.dueAt]);

  const dueLabel = useMemo(() => {
    try {
      return formatter.dateTime(new Date(tarea.dueAt), {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return tarea.dueAt;
    }
  }, [formatter, tarea.dueAt]);

  const cardStyle: CSSProperties = expired ? { borderColor: 'rgba(244,63,94,0.45)' } : {};
  const titleStyle: CSSProperties = {
    color: done ? 'var(--canon-cream-2)' : 'var(--canon-white-pure)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 14.5,
    lineHeight: 1.3,
    textDecoration: done ? 'line-through' : 'none',
  };
  const priorityToken = PRIORITY_COLORS[tarea.priority] ?? PRIORITY_COLORS.media;
  const priorityStyle: CSSProperties = priorityToken
    ? {
        background: priorityToken.bg,
        border: `1px solid ${priorityToken.border}`,
        color: priorityToken.text,
        borderRadius: 'var(--canon-radius-pill)',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 10px',
        fontFamily: 'var(--font-body)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }
    : {};

  return (
    <Card
      hoverable
      variant="default"
      className={cn('canon-tarea-card flex flex-col gap-3 p-4')}
      style={cardStyle}
      lang={locale}
    >
      <div className="flex items-start gap-3">
        {/* biome-ignore lint/a11y/useSemanticElements: custom-styled checkbox needs button container; role+aria-checked are canonical */}
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={t('card.completeAria')}
          disabled={done || isCompleting}
          onClick={() => onComplete(tarea.id)}
          className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{
            border: `1.5px solid ${done ? 'var(--canon-indigo)' : 'rgba(255,255,255,0.32)'}`,
            background: done ? 'var(--canon-indigo)' : 'transparent',
            cursor: done ? 'default' : 'pointer',
            transition: 'all 180ms ease-out',
          }}
        >
          {done ? (
            <svg
              aria-hidden="true"
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 6L5 8.5L9.5 4"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
        <div className="flex flex-1 flex-col gap-2">
          <h3 style={titleStyle}>{tarea.title}</h3>
          {tarea.description ? (
            <p
              className="text-sm"
              style={{
                color: 'var(--canon-cream-2)',
                fontFamily: 'var(--font-body)',
                fontSize: 12.5,
                lineHeight: 1.4,
              }}
            >
              {tarea.description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {expired ? (
              <span
                style={{
                  background: 'rgba(244,63,94,0.16)',
                  border: '1px solid rgba(244,63,94,0.45)',
                  borderRadius: 'var(--canon-radius-pill)',
                  color: '#fca5a5',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 10px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {t('card.overdue', { days: daysOverdue })}
              </span>
            ) : null}
            <span style={priorityStyle}>{t(`priority.${tarea.priority}`)}</span>
            <span
              style={{
                color: 'var(--canon-cream-2)',
                fontFamily: 'var(--font-body)',
                fontSize: 11.5,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {dueLabel}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
