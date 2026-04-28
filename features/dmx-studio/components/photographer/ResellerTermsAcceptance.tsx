'use client';

// F14.F.10 Sprint 9 BIBLIA — Reseller Terms Acceptance modal (Plan Fotógrafo).
// Modal mostrado en onboarding antes de crear primer video. Checkbox "Acepto
// términos reventa permitida" + tRPC acceptResellerTerms (router shipped).
// ADR-050 canon: pill buttons, brand gradient firma, motion ≤ 850ms.

import Link from 'next/link';
import { type CSSProperties, useCallback, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface ResellerTermsAcceptanceProps {
  readonly locale: string;
  readonly onAccepted?: () => void;
  readonly initiallyOpen?: boolean;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 6, 16, 0.78)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: '20px',
};

const modalStyle: CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  padding: '32px 32px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '22px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '24px',
  fontWeight: 800,
  color: 'var(--canon-cream)',
  letterSpacing: '-0.01em',
};

const subtitleStyle: CSSProperties = {
  fontSize: '14px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.6,
};

const bulletListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '16px 18px',
  background: 'var(--surface-recessed)',
  borderRadius: '14px',
  border: '1px solid var(--canon-border)',
};

const bulletItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  fontSize: '13px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.55,
};

const bulletDotStyle: CSSProperties = {
  flexShrink: 0,
  width: '6px',
  height: '6px',
  borderRadius: '9999px',
  background: 'var(--canon-indigo-2)',
  marginTop: '8px',
};

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '14px 16px',
  background: 'rgba(99, 102, 241, 0.08)',
  border: '1px solid rgba(99, 102, 241, 0.22)',
  borderRadius: '12px',
};

const checkboxStyle: CSSProperties = {
  width: '18px',
  height: '18px',
  marginTop: '2px',
  accentColor: '#6366F1',
  cursor: 'pointer',
};

const linkStyle: CSSProperties = {
  color: 'var(--canon-indigo-3)',
  textDecoration: 'underline',
  fontWeight: 500,
};

const errorStyle: CSSProperties = {
  fontSize: '12.5px',
  color: '#fca5a5',
};

const TERMS_BULLETS: ReadonlyArray<string> = [
  'Reventa de tus videos a clientes finales (asesores, agencias) está permitida sin comisión.',
  'Tú defines tu pricing y markup; DMX Studio cobra el plan base ($67/mes Foto).',
  'DMX Studio no garantiza outcomes (ventas, leads) a clientes finales — eso queda entre tú y ellos.',
  'Los videos generados pertenecen a ti y a tu cliente final (IP compartida según contrato bilateral).',
  'Cancelación + reembolso siguen las políticas DMX Studio canon.',
];

export function ResellerTermsAcceptance({
  locale,
  onAccepted,
  initiallyOpen = true,
}: ResellerTermsAcceptanceProps) {
  const [open, setOpen] = useState<boolean>(initiallyOpen);
  const [checked, setChecked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const checkboxId = useId();
  const titleId = useId();
  const descriptionId = useId();

  const acceptMutation = trpc.studio.sprint9Photographer.acceptResellerTerms.useMutation({
    onSuccess: () => {
      setOpen(false);
      if (onAccepted) onAccepted();
    },
    onError: (err) => {
      setError(err.message ?? 'No pudimos guardar tu aceptación. Intenta de nuevo.');
    },
  });

  const handleAccept = useCallback(() => {
    setError(null);
    if (!checked) {
      setError('Marca la casilla para aceptar los términos.');
      return;
    }
    acceptMutation.mutate();
  }, [acceptMutation, checked]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      style={overlayStyle}
    >
      <Card variant="elevated" style={modalStyle}>
        <div>
          <h2 id={titleId} style={titleStyle}>
            Términos de reventa permitida
          </h2>
          <p id={descriptionId} style={{ ...subtitleStyle, marginTop: '8px' }}>
            Antes de crear tu primer video, confirma que entiendes el modelo Plan Fotógrafo:
          </p>
        </div>

        <div style={bulletListStyle}>
          {TERMS_BULLETS.map((bullet) => (
            <div key={bullet} style={bulletItemStyle}>
              <span aria-hidden="true" style={bulletDotStyle} />
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        <p style={{ ...subtitleStyle, fontSize: '12.5px' }}>
          Lee los{' '}
          <Link
            href={`/${locale}/studio-app/photographer/legal/reseller-terms`}
            style={linkStyle}
            target="_blank"
            rel="noopener noreferrer"
          >
            términos completos de reventa
          </Link>{' '}
          antes de aceptar.
        </p>

        <label htmlFor={checkboxId} style={checkboxRowStyle}>
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={checkboxStyle}
            disabled={acceptMutation.isPending}
          />
          <span style={{ fontSize: '13.5px', color: 'var(--canon-cream)', lineHeight: 1.55 }}>
            Acepto los términos de reventa permitida y entiendo que soy responsable de mi pricing y
            mi relación con clientes finales.
          </span>
        </label>

        {error ? <span style={errorStyle}>{error}</span> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleAccept}
            disabled={acceptMutation.isPending || !checked}
          >
            {acceptMutation.isPending ? 'Guardando...' : 'Aceptar y continuar'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
