import { type CSSProperties, forwardRef, type HTMLAttributes, useMemo } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export type CalendarEventType = 'visit' | 'call' | 'sign' | 'message' | 'meeting';

export interface CalendarEvent {
  id: string;
  date: Date;
  label: string;
  type?: CalendarEventType;
}

export interface CalendarConstellationProps extends HTMLAttributes<HTMLDivElement> {
  events: readonly CalendarEvent[];
  range: { from: Date; to: Date };
  height?: number;
  ariaLabel?: string;
  onEventClick?: (event: CalendarEvent) => void;
}

const TYPE_COLOR: Record<CalendarEventType, string> = {
  visit: 'var(--accent-teal)',
  call: 'var(--canon-indigo)',
  sign: 'var(--accent-gold)',
  message: 'var(--accent-violet)',
  meeting: 'var(--mod-operaciones)',
};

export const CalendarConstellation = forwardRef<HTMLDivElement, CalendarConstellationProps>(
  function CalendarConstellation(
    {
      events,
      range,
      height = 64,
      ariaLabel = 'Constelación de eventos',
      onEventClick,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const sorted = useMemo(
      () => [...events].sort((a, b) => a.date.getTime() - b.date.getTime()),
      [events],
    );
    const fromMs = range.from.getTime();
    const toMs = range.to.getTime();
    const span = Math.max(toMs - fromMs, 1);
    const xFor = (date: Date): number => {
      const t = date.getTime();
      const ratio = Math.max(0, Math.min(1, (t - fromMs) / span));
      return ratio * 100;
    };

    const containerStyle: CSSProperties = {
      width: '100%',
      ...style,
    };

    const cy = height / 2;

    return (
      <div
        ref={ref}
        data-canon-variant="calendar-constellation"
        className={cn('canon-calendar-constellation', className)}
        style={containerStyle}
        {...rest}
      >
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel}
        >
          <title>{ariaLabel}</title>
          <line
            x1={0}
            y1={cy}
            x2={100}
            y2={cy}
            stroke="var(--canon-border-2)"
            strokeWidth={0.5}
            strokeDasharray="1.5 2"
          />
          {sorted.map((event, i) => {
            if (i >= sorted.length - 1) return null;
            const next = sorted[i + 1];
            if (!next) return null;
            return (
              <line
                key={`c-${event.id}`}
                x1={xFor(event.date)}
                y1={cy}
                x2={xFor(next.date)}
                y2={cy}
                stroke="var(--canon-cream-3)"
                strokeWidth={0.6}
              />
            );
          })}
          {sorted.map((event) => {
            const color = TYPE_COLOR[event.type ?? 'message'];
            const cx = xFor(event.date);
            const isClickable = Boolean(onEventClick);
            return (
              <g
                key={event.id}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
                {...(isClickable
                  ? {
                      role: 'button' as const,
                      tabIndex: 0,
                      onClick: () => onEventClick?.(event),
                      onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onEventClick?.(event);
                        }
                      },
                    }
                  : {})}
              >
                <circle cx={cx} cy={cy} r={2.5} fill={color} />
                <title>
                  {event.label} — {event.date.toISOString().slice(0, 10)}
                </title>
              </g>
            );
          })}
        </svg>
      </div>
    );
  },
);
