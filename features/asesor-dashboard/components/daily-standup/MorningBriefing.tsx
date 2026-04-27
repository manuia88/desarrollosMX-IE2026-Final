'use client';

import { useTranslations } from 'next-intl';
import { FadeUp } from '@/shared/ui/motion/fade-up';
import { Button } from '@/shared/ui/primitives/canon/button';
import { Card } from '@/shared/ui/primitives/canon/card';
import { DisclosurePill } from '@/shared/ui/primitives/canon/disclosure-pill';
import { useListenMode } from '@/shared/ui/primitives/canon-asesor/use-listen-mode';

export interface MorningBriefingProps {
  bullets: readonly string[];
}

export function MorningBriefing({ bullets }: MorningBriefingProps) {
  const t = useTranslations('AsesorDashboard.briefing');
  const text = bullets.join('. ');
  const listen = useListenMode({ text, lang: 'es-MX' });

  return (
    <FadeUp delay={0.1} durationMs={600} distance={18}>
      <Card
        variant="glow"
        className="flex flex-col gap-4 p-6"
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
          <DisclosurePill tone="violet">{t('disclosure')}</DisclosurePill>
        </header>
        <svg
          viewBox="0 0 200 32"
          width="100%"
          height="32"
          aria-hidden="true"
          style={{ color: 'var(--canon-indigo)' }}
        >
          {Array.from({ length: 30 }, (_, i) => {
            const h = 6 + Math.abs(Math.sin(i * 0.7)) * 18;
            return (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: decorative waveform, fixed positional bars
                key={i}
                x={i * 7}
                y={(32 - h) / 2}
                width={3}
                height={h}
                rx={1.5}
                fill="currentColor"
                opacity={0.6}
              />
            );
          })}
        </svg>
        <ul className="flex flex-col gap-2">
          {bullets.length === 0 ? (
            <li
              className="text-[13px]"
              style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
            >
              {t('empty')}
            </li>
          ) : (
            bullets.map((b) => (
              <li
                key={b}
                className="text-[13px] leading-relaxed"
                style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-body)' }}
              >
                {b}
              </li>
            ))
          )}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={listen.isListening}
          aria-label={t('listenAria')}
          {...listen.holdHandlers}
          disabled={listen.isStub || bullets.length === 0}
        >
          {listen.isListening ? t('listening') : t('listen', { minutes: 4 })}
        </Button>
      </Card>
    </FadeUp>
  );
}
