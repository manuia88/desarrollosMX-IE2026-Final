'use client';

// F14.F.5 Sprint 4 UPGRADE 8 LATERAL — DMX Studio AI coach widget.
// Owned por sub-agent 5. Discreto top-right del dashboard. Avatar AI (icon) + 1 mensaje.
// H1 sólo 1 mensaje display + buttons "Hecho" / "Más tarde" / "Cerrar".
//
// STUB ADR-018 — Full chat (multi-turn) defer H2 L-NEW-AI-COACH-FULL-CHAT-EXTEND.
// Aquí no se renderiza un mini-chat: sólo 1 mensaje + 3 botones acknowledge.
//
// Canon ADR-050: AI signal vía --gradient-ai violet glow (Card variant glow).
// Strings ES inline (R11). Pill buttons (R8). translateY-only (R7). Cero emoji (R6).

import { type CSSProperties, useCallback, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '15px',
  letterSpacing: '-0.005em',
  color: '#FFFFFF',
};

const messageStyle: CSSProperties = {
  color: 'var(--canon-cream)',
  fontSize: '13.5px',
  lineHeight: 1.55,
  fontFamily: 'var(--font-body)',
};

const sparkIcon = (
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
    <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
);

export function AICoachWidget() {
  const sessionQuery = trpc.studio.aiCoach.getSessionToday.useQuery();
  const recordMutation = trpc.studio.aiCoach.recordResponse.useMutation();
  const dismissMutation = trpc.studio.aiCoach.dismissSession.useMutation();
  const utils = trpc.useUtils();

  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const handleDone = useCallback(async () => {
    if (!sessionQuery.data) return;
    await recordMutation.mutateAsync({
      sessionId: sessionQuery.data.id,
      response: 'done',
      completed: true,
    });
    await utils.studio.aiCoach.getSessionToday.invalidate();
    setExpanded(false);
  }, [recordMutation, sessionQuery.data, utils.studio.aiCoach.getSessionToday]);

  const handleLater = useCallback(async () => {
    if (!sessionQuery.data) return;
    await recordMutation.mutateAsync({
      sessionId: sessionQuery.data.id,
      response: 'later',
      completed: false,
    });
    await utils.studio.aiCoach.getSessionToday.invalidate();
    setExpanded(false);
  }, [recordMutation, sessionQuery.data, utils.studio.aiCoach.getSessionToday]);

  const handleDismiss = useCallback(async () => {
    if (!sessionQuery.data) return;
    await dismissMutation.mutateAsync({ sessionId: sessionQuery.data.id });
    await utils.studio.aiCoach.getSessionToday.invalidate();
    setExpanded(false);
  }, [dismissMutation, sessionQuery.data, utils.studio.aiCoach.getSessionToday]);

  if (sessionQuery.isLoading || !sessionQuery.data || sessionQuery.data.dismissed) {
    return null;
  }
  const session = sessionQuery.data;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Abrir mensaje del coach diario"
        data-testid="studio-ai-coach-toggle"
        className="inline-flex items-center gap-2 px-3.5 h-[40px] rounded-[var(--canon-radius-pill)] hover:-translate-y-px transition-transform duration-[var(--canon-duration-fast)]"
        style={{
          background: 'var(--surface-spotlight)',
          border: '1px solid var(--canon-border-2)',
          color: 'var(--canon-cream)',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        <IconCircle tone="violet" size="sm" icon={sparkIcon} />
        Coach diario
      </button>
    );
  }

  return (
    <Card
      variant="glow"
      className="flex flex-col gap-3 p-5 max-w-md"
      role="region"
      aria-label="Mensaje coach diario"
      data-testid="studio-ai-coach-widget"
    >
      <div className="flex items-center gap-3">
        <IconCircle tone="violet" size="sm" icon={sparkIcon} />
        <h3 style={titleStyle}>Tu coach hoy</h3>
        <DisclosurePill tone="violet">IA</DisclosurePill>
      </div>
      <p style={messageStyle} data-testid="studio-ai-coach-message">
        {session.suggestedAction}
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="primary"
          size="sm"
          onClick={handleDone}
          disabled={recordMutation.isPending}
          aria-label="Marcar acción del coach como hecha"
          data-testid="studio-ai-coach-done"
        >
          Hecho
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLater}
          disabled={recordMutation.isPending}
          aria-label="Posponer mensaje del coach"
          data-testid="studio-ai-coach-later"
        >
          Más tarde
        </Button>
        <Button
          variant="glass"
          size="sm"
          onClick={handleDismiss}
          disabled={dismissMutation.isPending}
          aria-label="Cerrar mensaje del coach"
          data-testid="studio-ai-coach-dismiss"
        >
          Cerrar
        </Button>
      </div>
    </Card>
  );
}
