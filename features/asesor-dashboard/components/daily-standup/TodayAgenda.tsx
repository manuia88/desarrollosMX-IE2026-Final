'use client';

import { useTranslations } from 'next-intl';
import { IconClock } from '@/shared/ui/icons/canon-icons';
import { FadeUp } from '@/shared/ui/motion/fade-up';
import { Card } from '@/shared/ui/primitives/canon/card';
import { IconCircle } from '@/shared/ui/primitives/canon/icon-circle';

export interface AgendaEvent {
  id: string;
  time: string;
  label: string;
  type: 'visit' | 'call' | 'sign';
}

export interface TodayAgendaProps {
  events: readonly AgendaEvent[];
}

const TONE: Record<AgendaEvent['type'], 'teal' | 'indigo' | 'gold'> = {
  visit: 'teal',
  call: 'indigo',
  sign: 'gold',
};

export function TodayAgenda({ events }: TodayAgendaProps) {
  const t = useTranslations('AsesorDashboard.agenda');

  return (
    <FadeUp delay={0.18} durationMs={600} distance={18}>
      <Card
        variant="elevated"
        className="flex h-full flex-col gap-3 p-6"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <header className="flex items-center justify-between">
          <h2
            className="text-[14px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--canon-white-pure)', fontFamily: 'var(--font-body)' }}
          >
            {t('title')}
          </h2>
          <span
            className="text-[11px]"
            style={{
              color: 'var(--canon-cream-3)',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'var(--font-body)',
            }}
          >
            {t('count', { count: events.length })}
          </span>
        </header>
        {events.length === 0 ? (
          <p
            className="text-[13px]"
            style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
          >
            {t('empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-[12px] p-2"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <IconCircle size="sm" tone={TONE[event.type]} icon={<IconClock size={14} />} />
                <div className="flex-1">
                  <span
                    className="block text-[13px] font-medium"
                    style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-body)' }}
                  >
                    {event.label}
                  </span>
                  <span
                    className="block text-[11px]"
                    style={{
                      color: 'var(--canon-cream-3)',
                      fontVariantNumeric: 'tabular-nums',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {event.time} · {t(`type.${event.type}`)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </FadeUp>
  );
}
