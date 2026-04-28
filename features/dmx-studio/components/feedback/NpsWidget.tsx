'use client';

// F14.F.11 Sprint 10 BIBLIA Tarea 10.4 — NPS Widget post-video.
// Modal NPS 0-10 + comment opcional + 5 quick reasons checkboxes.
// Submit consume trpc.studio.sprint10Feedback.submitNps (STUB H2 — throws NOT_IMPLEMENTED).
// Catch NOT_IMPLEMENTED → toast user-friendly + UI disabled hint.
// ADR-050 canon: pill buttons (radius 9999px), brand gradient, motion ≤ 850ms,
// translateY-only hover, tokens @theme (--canon-*, --accent-*).
//
// STUB ADR-018 4 señales:
//   (1) Comment + heuristic mensaje "Recolección beta pausada".
//   (2) onSubmit catches NOT_IMPLEMENTED desde tRPC mutation.
//   (3) UI disabled hint visible (pill amber + tooltip + aria-disabled state when stubbed).
//   (4) L-NEW-STUDIO-NPS-DATA-COLLECTION-ACTIVATE pointer en route + comments.

import { type CSSProperties, type ReactElement, useCallback, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export const NPS_QUICK_REASONS: ReadonlyArray<string> = [
  'Velocidad de generación',
  'Calidad del video',
  'Facilidad de uso',
  'Variedad de formatos',
  'Calidad del copy',
];

const COMMENT_MAX_LENGTH = 1000;

export interface NpsWidgetProps {
  readonly projectId?: string;
  readonly context?: 'post_video' | 'two_week_survey' | 'post_onboarding';
  readonly onClose?: () => void;
  readonly onSubmitted?: () => void;
}

export interface NpsWidgetPresentationProps {
  readonly score: number | null;
  readonly comment: string;
  readonly selectedReasons: ReadonlyArray<string>;
  readonly toastMessage: string | null;
  readonly toastTone: 'info' | 'error' | 'success';
  readonly submitting: boolean;
  readonly stubH2: boolean;
  readonly validationError: string | null;
  readonly onSelectScore: (n: number) => void;
  readonly onCommentChange: (s: string) => void;
  readonly onToggleReason: (r: string) => void;
  readonly onSubmit: () => void;
  readonly onClose?: (() => void) | undefined;
}

export interface ScoreColorTier {
  readonly tier: 'detractor' | 'passive' | 'promoter';
  readonly background: string;
  readonly border: string;
}

export function tierForScore(score: number): ScoreColorTier {
  if (score <= 6) {
    return {
      tier: 'detractor',
      background: 'rgba(236, 72, 153, 0.12)',
      border: 'rgba(236, 72, 153, 0.32)',
    };
  }
  if (score <= 8) {
    return {
      tier: 'passive',
      background: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.32)',
    };
  }
  return {
    tier: 'promoter',
    background: 'rgba(20, 184, 166, 0.12)',
    border: 'rgba(20, 184, 166, 0.32)',
  };
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 6, 16, 0.78)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
  padding: '24px',
};

const modalShellStyle: CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  padding: '28px 30px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '22px',
  fontWeight: 800,
  color: 'var(--canon-cream)',
  letterSpacing: '-0.01em',
};

const subtitleStyle: CSSProperties = {
  fontSize: '13.5px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.55,
};

const scoreRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(11, 1fr)',
  gap: '6px',
};

const scoreButtonStyle = (selected: boolean, score: number): CSSProperties => {
  const tier = tierForScore(score);
  return {
    width: '100%',
    aspectRatio: '1 / 1',
    minHeight: '38px',
    borderRadius: '9999px',
    border: '1px solid',
    background: selected ? tier.background : 'rgba(255,255,255,0.04)',
    borderColor: selected ? tier.border : 'rgba(255,255,255,0.14)',
    color: 'var(--canon-cream)',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'transform 180ms ease, background 180ms ease, border-color 180ms ease',
    fontVariantNumeric: 'tabular-nums',
  };
};

const reasonsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '8px',
};

const reasonPillStyle = (selected: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 14px',
  borderRadius: '9999px',
  border: '1px solid',
  background: selected ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.04)',
  borderColor: selected ? 'rgba(99,102,241,0.40)' : 'rgba(255,255,255,0.14)',
  color: selected ? 'var(--canon-indigo-3)' : 'var(--canon-cream-2)',
  fontSize: '12.5px',
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'transform 180ms ease, background 180ms ease, border-color 180ms ease',
});

const commentInputStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '14px',
  padding: '12px 14px',
  fontSize: '14px',
  color: 'var(--canon-cream)',
  outline: 'none',
  minHeight: '90px',
  resize: 'vertical',
  fontFamily: 'var(--font-body)',
};

const labelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--canon-cream)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const helperTextStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--canon-cream-3)',
};

const errorTextStyle: CSSProperties = {
  fontSize: '12px',
  color: '#fca5a5',
};

const toastStyle = (tone: 'info' | 'error' | 'success'): CSSProperties => {
  const palette: Record<
    'info' | 'error' | 'success',
    { bg: string; border: string; color: string }
  > = {
    info: {
      bg: 'rgba(245, 158, 11, 0.10)',
      border: 'rgba(245, 158, 11, 0.32)',
      color: '#fcd34d',
    },
    error: {
      bg: 'rgba(236, 72, 153, 0.10)',
      border: 'rgba(236, 72, 153, 0.32)',
      color: '#f9a8d4',
    },
    success: {
      bg: 'rgba(20, 184, 166, 0.10)',
      border: 'rgba(20, 184, 166, 0.32)',
      color: '#5eead4',
    },
  };
  const { bg, border, color } = palette[tone];
  return {
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid',
    background: bg,
    borderColor: border,
    color,
    fontSize: '13px',
    lineHeight: 1.5,
  };
};

const STUB_TOAST_MESSAGE =
  'Recolección beta pausada. Activación cuando tengamos 50+ asesores invitados.';

export function NpsWidgetPresentation({
  score,
  comment,
  selectedReasons,
  toastMessage,
  toastTone,
  submitting,
  stubH2,
  validationError,
  onSelectScore,
  onCommentChange,
  onToggleReason,
  onSubmit,
  onClose,
}: NpsWidgetPresentationProps): ReactElement {
  const commentId = 'nps-comment-input';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nps-widget-title"
      style={overlayStyle}
      data-testid="nps-widget-overlay"
    >
      <Card variant="elevated" style={modalShellStyle} data-testid="nps-widget-modal">
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 id="nps-widget-title" style={titleStyle}>
              ¿Qué tan probable es que recomiendes DMX Studio?
            </h2>
            {stubH2 ? <DisclosurePill tone="amber">BETA — H2</DisclosurePill> : null}
          </div>
          <span style={subtitleStyle}>
            Tu respuesta nos ayuda a mejorar. Selecciona un puntaje del 0 al 10.
          </span>
        </div>

        {toastMessage ? (
          <div role="status" style={toastStyle(toastTone)} data-testid="nps-widget-toast">
            {toastMessage}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={labelStyle}>Puntaje</span>
          <div style={scoreRowStyle} data-nps-score-row="true">
            {Array.from({ length: 11 }, (_, n) => n).map((n) => {
              const selected = score === n;
              return (
                <button
                  key={n}
                  type="button"
                  data-testid={`nps-score-${n}`}
                  data-score={n}
                  data-selected={selected ? 'true' : 'false'}
                  aria-pressed={selected}
                  aria-label={`Puntaje ${n}`}
                  onClick={() => onSelectScore(n)}
                  style={scoreButtonStyle(selected, n)}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--canon-cream-3)',
            }}
          >
            <span>Nada probable</span>
            <span>Muy probable</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={labelStyle}>¿Qué influyó? (opcional)</span>
          <div style={reasonsGridStyle} data-nps-reasons-grid="true">
            {NPS_QUICK_REASONS.map((reason) => {
              const selected = selectedReasons.includes(reason);
              return (
                <button
                  key={reason}
                  type="button"
                  data-testid={`nps-reason-${reason.replace(/\s+/g, '-').toLowerCase()}`}
                  data-reason={reason}
                  aria-pressed={selected}
                  onClick={() => onToggleReason(reason)}
                  style={reasonPillStyle(selected)}
                >
                  <span aria-hidden="true">{selected ? '✓' : '•'}</span>
                  {reason}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor={commentId} style={labelStyle}>
            Comentario (opcional)
          </label>
          <textarea
            id={commentId}
            data-testid="nps-comment"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Cuéntanos un poco más..."
            style={commentInputStyle}
            aria-describedby={`${commentId}-helper`}
          />
          <span id={`${commentId}-helper`} style={helperTextStyle}>
            {comment.length}/{COMMENT_MAX_LENGTH} caracteres
          </span>
          {validationError ? (
            <span style={errorTextStyle} role="alert" data-testid="nps-validation-error">
              {validationError}
            </span>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {onClose ? (
            <Button
              type="button"
              variant="glass"
              size="md"
              onClick={onClose}
              data-testid="nps-cancel"
              aria-label="Cerrar encuesta NPS"
            >
              Cerrar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onSubmit}
            disabled={submitting || score === null}
            data-testid="nps-submit"
            aria-label="Enviar puntaje NPS"
          >
            {submitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function NpsWidget({
  projectId,
  context = 'post_video',
  onClose,
  onSubmitted,
}: NpsWidgetProps): ReactElement {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [selectedReasons, setSelectedReasons] = useState<ReadonlyArray<string>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'info' | 'error' | 'success'>('info');
  const [stubH2, setStubH2] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submitMutation = trpc.studio.sprint10Feedback.submitNps.useMutation({
    onSuccess: () => {
      setToastMessage('Gracias por tu feedback');
      setToastTone('success');
      onSubmitted?.();
    },
    onError: (err) => {
      // STUB ADR-018 4 señales (2/4 catch): submitNps tira NOT_IMPLEMENTED H1.
      // Mensaje user-friendly explicando recolección pausada hasta H2.
      const isStub =
        err.data?.code === 'NOT_IMPLEMENTED' || /NOT_IMPLEMENTED/i.test(err.message ?? '');
      if (isStub) {
        setStubH2(true);
        setToastTone('info');
        setToastMessage(STUB_TOAST_MESSAGE);
      } else {
        setToastTone('error');
        setToastMessage('No pudimos enviar tu feedback. Intenta de nuevo.');
      }
    },
  });

  const handleToggleReason = useCallback((reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  }, []);

  const handleSubmit = useCallback(() => {
    setValidationError(null);
    if (score === null) {
      setValidationError('Selecciona un puntaje del 0 al 10.');
      return;
    }
    submitMutation.mutate({
      projectId,
      score,
      comment: comment.trim().length > 0 ? comment.trim() : undefined,
      reasons: selectedReasons.length > 0 ? [...selectedReasons] : undefined,
      context,
    });
  }, [score, comment, selectedReasons, context, projectId, submitMutation]);

  return (
    <NpsWidgetPresentation
      score={score}
      comment={comment}
      selectedReasons={selectedReasons}
      toastMessage={toastMessage}
      toastTone={toastTone}
      submitting={submitMutation.isPending}
      stubH2={stubH2}
      validationError={validationError}
      onSelectScore={setScore}
      onCommentChange={setComment}
      onToggleReason={handleToggleReason}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
