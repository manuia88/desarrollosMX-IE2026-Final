'use client';

// F14.F.11 Sprint 10 BIBLIA Tarea 10.4 — Interview Booking CTA (founder 1:1).
// Botón "Agendar entrevista 1:1 con founder" → abre Calendly link.
// Calendly link STUB H2 (no slot disponible hasta 50+ usuarios beta).
//
// STUB ADR-018 4 señales:
//   (1) Comment con razón H2: Calendly account + slot management diferido
//       hasta 50+ usuarios beta validados.
//   (2) handleBookInterview throws NOT_IMPLEMENTED al click programático,
//       y aunque el botón está aria-disabled visualmente, también apuntamos
//       el procedure stub en el comment (no existe procedure dedicado, esta
//       feature es 100% client-side link redirect).
//   (3) UI flag visible: aria-disabled="true" + data-stub + DisclosurePill BETA-H2 +
//       tooltip explicando activación.
//   (4) L-NEW-STUDIO-INTERVIEW-CALENDLY-LINK-ACTIVATE pointer en comments.
//       NOTE: relacionado con sprint10Feedback.submitNps (NOT_IMPLEMENTED) ya
//       que la entrevista es escalation de feedback negativo (NPS detractor).

import type { CSSProperties, ReactElement } from 'react';
import { Button, DisclosurePill } from '@/shared/ui/primitives/canon';

const STUB_REASON =
  'STUB ADR-018 — Calendly link founder 1:1 pendiente H2. ' +
  'Activación cuando 50+ usuarios beta validados. ' +
  'L-NEW-STUDIO-INTERVIEW-CALENDLY-LINK-ACTIVATE. ' +
  'Relacionado con sprint10Feedback.submitNps (NOT_IMPLEMENTED) — entrevista ' +
  'es escalation de detractor NPS.';

const STUB_TOOLTIP = 'Activación H2 cuando 50+ usuarios beta';

export interface InterviewBookingButtonProps {
  readonly variant?: 'primary' | 'glass' | 'ghost';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly label?: string;
}

const wrapperStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
};

export function InterviewBookingButton({
  variant = 'glass',
  size = 'md',
  label = 'Agendar entrevista 1:1 con founder',
}: InterviewBookingButtonProps): ReactElement {
  // STUB ADR-018 4 señales (2/4 throw): Calendly link no activo H1.
  const handleBookInterview = () => {
    throw new Error('NOT_IMPLEMENTED: interview_booking_calendly_h2_stub_adr_018');
  };

  return (
    <span style={wrapperStyle} title={STUB_TOOLTIP} data-testid="interview-booking-wrapper">
      <Button
        type="button"
        variant={variant}
        size={size}
        data-testid="interview-booking-cta"
        data-stub="adr-018"
        data-stub-feature="interview-calendly-h2"
        data-stub-reason={STUB_REASON}
        aria-disabled="true"
        aria-label={`${label} (activación H2 — pendiente 50+ usuarios beta)`}
        disabled
        onClick={handleBookInterview}
      >
        {label}
      </Button>
      <DisclosurePill tone="amber" data-testid="interview-booking-pill">
        BETA — H2
      </DisclosurePill>
    </span>
  );
}
