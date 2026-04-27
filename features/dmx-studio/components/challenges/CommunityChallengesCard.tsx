'use client';

// F14.F.5 Sprint 4 UPGRADE 6 LATERAL — DMX Studio community challenges card.
// Owned por sub-agent 5. Conditional render dashboard. Aplica canon ADR-050.
// Strings ES inline (R11). Pill button (R8). translateY-only (R7). Cero emoji (R6).

import { useRouter } from 'next/navigation';
import { type CSSProperties, useCallback } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

export interface CommunityChallengesCardProps {
  readonly locale: string;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '18px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const descriptionStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '13.5px',
  lineHeight: 1.5,
};

const metaStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '12.5px',
  lineHeight: 1.4,
  fontVariantNumeric: 'tabular-nums',
};

const trophyIcon = (
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
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM5 5H3a2 2 0 0 0 0 4h2M19 5h2a2 2 0 0 1 0 4h-2" />
  </svg>
);

export function CommunityChallengesCard({ locale }: CommunityChallengesCardProps) {
  const router = useRouter();
  const challengeQuery = trpc.studio.challenges.getCurrentWeek.useQuery();

  const handleParticipate = useCallback(() => {
    if (!challengeQuery.data) return;
    router.push(`/${locale}/studio-app/projects/new?challengeId=${challengeQuery.data.id}`);
  }, [router, locale, challengeQuery.data]);

  if (challengeQuery.isLoading || !challengeQuery.data) {
    return null;
  }

  const challenge = challengeQuery.data;

  return (
    <Card
      variant="spotlight"
      className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Reto semanal DMX Studio"
      data-testid="studio-community-challenges-card"
    >
      <div className="flex items-start gap-4">
        <IconCircle tone="gold" size="lg" icon={trophyIcon} />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 style={titleStyle}>{challenge.title}</h2>
            <DisclosurePill tone="amber">Reto semanal</DisclosurePill>
          </div>
          <p style={descriptionStyle}>{challenge.description}</p>
          <p style={metaStyle}>
            {challenge.participantsCount} participantes · {challenge.rewardXp} XP de recompensa
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="md"
        onClick={handleParticipate}
        aria-label="Participar en el reto semanal"
        data-testid="studio-community-challenges-cta"
      >
        Participar
      </Button>
    </Card>
  );
}
