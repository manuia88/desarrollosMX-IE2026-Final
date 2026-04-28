'use client';

// F14.F.7 Sprint 6 Tarea 6.5 — Canon paywall card surfaced when current plan
// no cubre la feature requerida (Agency-gated toggles, Cinema Mode).
// STUB ADR-018 — CTA navega a /studio-app/billing (route real existe).

import Link from 'next/link';
import type { CSSProperties } from 'react';

export type PaywallRequiredPlan = 'agency' | 'pro' | 'foto';

export interface PlanPaywallCanonProps {
  readonly requiredPlan: PaywallRequiredPlan;
  readonly currentPlan: string | null;
  readonly featureName: string;
  readonly ctaHref?: string;
}

const PLAN_LABELS: Record<PaywallRequiredPlan, string> = {
  agency: 'DMX Agency $97/mes',
  pro: 'DMX Pro',
  foto: 'DMX Foto',
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '20px 22px',
  borderRadius: 'var(--canon-radius-card)',
  background: 'var(--surface-elevated)',
  border: '1px solid rgba(168, 85, 247, 0.32)',
  boxShadow: 'var(--shadow-canon-spotlight)',
  transition: 'transform var(--canon-duration-fast) ease',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-heading, var(--font-body))',
  fontSize: '17px',
  fontWeight: 700,
  color: 'var(--canon-cream)',
  letterSpacing: '-0.01em',
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
  fontWeight: 400,
  lineHeight: 1.5,
  color: 'var(--canon-cream-2)',
};

const persuasiveStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  fontWeight: 500,
  color: 'var(--accent-violet)',
};

const ctaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  marginTop: '4px',
};

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 22px',
  borderRadius: 'var(--canon-radius-pill)',
  background: 'var(--gradient-ai)',
  color: '#FFFFFF',
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
  fontWeight: 700,
  textDecoration: 'none',
  border: '1px solid rgba(168, 85, 247, 0.45)',
  transition: 'transform var(--canon-duration-fast) ease',
};

const PERSUASIVE_COPY: Record<PaywallRequiredPlan, string> = {
  agency: 'Desbloquea automatización Agency: video AI, drone simulation y staging premium.',
  pro: 'Sube a Pro y libera todas las funciones de generación AI sin marca de agua.',
  foto: 'Activa Foto y empieza a publicar fichas con calidad estudio en minutos.',
};

export function PlanPaywallCanon({
  requiredPlan,
  currentPlan,
  featureName,
  ctaHref,
}: PlanPaywallCanonProps) {
  const planLabel = PLAN_LABELS[requiredPlan];
  const target = ctaHref && ctaHref.length > 0 ? ctaHref : '/studio-app/billing';
  const ariaLabel = `Upgrade requerido a ${planLabel} para usar ${featureName}`;

  return (
    <section
      aria-label={ariaLabel}
      data-testid="plan-paywall-canon"
      data-required-plan={requiredPlan}
      data-current-plan={currentPlan ?? 'none'}
      style={cardStyle}
    >
      <h3 style={titleStyle}>Upgrade a {planLabel}</h3>
      <p style={descriptionStyle}>
        Esta función ({featureName}) requiere plan {planLabel}.
      </p>
      <p style={persuasiveStyle}>{PERSUASIVE_COPY[requiredPlan]}</p>
      <div style={ctaRowStyle}>
        <Link
          href={target}
          aria-label={`Ver planes para activar ${planLabel}`}
          style={ctaStyle}
          data-testid="plan-paywall-cta"
        >
          Ver planes
        </Link>
      </div>
    </section>
  );
}
