'use client';

// F14.F.11 Sprint 10 BIBLIA Tarea 10.4 — Satisfaction Survey post-onboarding (2 semanas).
// Componente CTA que dispara survey link 14 días post signup.
// Resend trigger automático = STUB H2 (no email transactional configurado para esto aún).
//
// STUB ADR-018 4 señales:
//   (1) Comment con razón H2: Resend template + cron 2-week scheduling pendiente.
//   (2) handleSendSurvey throws NOT_IMPLEMENTED al click programático.
//   (3) UI disabled state visible: aria-disabled + data-stub + DisclosurePill BETA-H2 visible
//       + tooltip explicando activación H2.
//   (4) L-NEW-STUDIO-RESEND-2WEEK-SURVEY pointer en comments + redirect path.

import type { CSSProperties, ReactElement } from 'react';
import { Button, Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

const STUB_REASON =
  'STUB ADR-018 — Resend trigger 2-week post-onboarding pendiente H2. ' +
  'L-NEW-STUDIO-RESEND-2WEEK-SURVEY-TEMPLATE-ACTIVATE.';

const STUB_TOOLTIP =
  'Activación H2: cuando configuremos plantilla Resend + cron 14d post signup. ' +
  'Por ahora puedes dejar feedback manual desde tu proyecto.';

export interface SatisfactionSurveyProps {
  readonly userEmail?: string;
  readonly daysSinceSignup?: number;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
  padding: '24px 28px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '14px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '20px',
  fontWeight: 800,
  color: 'var(--canon-cream)',
  letterSpacing: '-0.01em',
};

const subtitleStyle: CSSProperties = {
  fontSize: '13.5px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.55,
};

const stubHintStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--canon-cream-3)',
  fontStyle: 'italic',
};

const mailIcon = (
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
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);

export function SatisfactionSurvey({
  userEmail,
  daysSinceSignup,
}: SatisfactionSurveyProps): ReactElement {
  // STUB ADR-018 4 señales (2/4 throw): Resend template H2 — no enviar email todavía.
  const handleSendSurvey = () => {
    // STUB ADR-018 — pointer L-NEW-STUDIO-RESEND-2WEEK-SURVEY-TEMPLATE-ACTIVATE.
    throw new Error('NOT_IMPLEMENTED: satisfaction_survey_2week_resend_h2_stub_adr_018');
  };

  return (
    <Card
      variant="recessed"
      style={containerStyle}
      data-testid="satisfaction-survey"
      data-stub="adr-018"
      data-stub-feature="resend-2week-survey-h2"
    >
      <div style={headerStyle}>
        <IconCircle tone="indigo" size="md" icon={mailIcon} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={titleStyle}>Encuesta a 2 semanas</h3>
            <DisclosurePill tone="amber">BETA — H2</DisclosurePill>
          </div>
          <p style={subtitleStyle}>
            Catorce días después del signup te enviaremos por email una encuesta corta para entender
            qué funcionó y qué no. Tu respuesta nos guía para iterar.
          </p>
          {typeof daysSinceSignup === 'number' ? (
            <p style={subtitleStyle}>
              Llevas {daysSinceSignup} {daysSinceSignup === 1 ? 'día' : 'días'} con DMX Studio
              {userEmail ? ` (${userEmail})` : ''}.
            </p>
          ) : null}
          <p style={stubHintStyle}>{STUB_TOOLTIP}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span title={STUB_TOOLTIP} data-testid="satisfaction-survey-tooltip">
          <Button
            type="button"
            variant="glass"
            size="md"
            data-testid="satisfaction-survey-cta"
            data-stub="adr-018"
            data-stub-feature="resend-2week-survey-h2"
            data-stub-reason={STUB_REASON}
            aria-disabled="true"
            aria-label="Enviar encuesta a 2 semanas (activación H2)"
            disabled
            onClick={handleSendSurvey}
          >
            Enviar encuesta (H2)
          </Button>
        </span>
      </div>
    </Card>
  );
}
