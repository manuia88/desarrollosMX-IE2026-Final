'use client';

// FASE 14.F.2 Sprint 1 — Feedback form for project result.
// Rating 1-5 (numbered pill solid/outline pattern, NO emoji), selected hook
// radio (auto-fill), preferred format radio, comments textarea, would_recommend
// toggle. Submits via trpc.studio.projects.submitFeedback.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback, useId, useState } from 'react';
import {
  type SubmitProjectFeedback,
  submitProjectFeedbackInput,
} from '@/features/dmx-studio/components/projects/_feedback-schema';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface FeedbackFormProps {
  readonly projectId: string;
  readonly currentHook: 'hook_a' | 'hook_b' | 'hook_c';
}

const RATING_VALUES: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
const FORMAT_VALUES: ReadonlyArray<'9x16' | '1x1' | '16x9'> = ['9x16', '1x1', '16x9'];

const labelStyle: CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.01em',
};

const ratingPillStyle = (active: boolean): CSSProperties => ({
  appearance: 'none',
  border: '1px solid',
  borderColor: active ? 'rgba(99,102,241,0.60)' : 'var(--canon-border)',
  background: active ? 'var(--gradient-ai)' : 'var(--surface-recessed)',
  color: active ? '#FFFFFF' : 'var(--canon-cream-2)',
  width: '40px',
  height: '40px',
  borderRadius: 'var(--canon-radius-pill)',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  fontVariantNumeric: 'tabular-nums',
});

const radioRowStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
};

const radioPillStyle = (active: boolean): CSSProperties => ({
  appearance: 'none',
  border: '1px solid',
  borderColor: active ? 'rgba(99,102,241,0.60)' : 'var(--canon-border)',
  background: active ? 'rgba(99,102,241,0.10)' : 'var(--surface-recessed)',
  color: active ? 'var(--canon-indigo-3)' : 'var(--canon-cream-2)',
  padding: '8px 16px',
  borderRadius: 'var(--canon-radius-pill)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  fontWeight: active ? 700 : 500,
  cursor: 'pointer',
});

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: '92px',
  padding: '12px 14px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  color: 'var(--canon-cream)',
  fontSize: '13.5px',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
};

export function FeedbackForm({ projectId, currentHook }: FeedbackFormProps) {
  const t = useTranslations('Studio.result');
  const formId = useId();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [selectedHook, setSelectedHook] = useState<'hook_a' | 'hook_b' | 'hook_c'>(currentHook);
  const [preferredFormat, setPreferredFormat] = useState<'9x16' | '1x1' | '16x9'>('9x16');
  const [comments, setComments] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const submitFeedback = trpc.studio.projects.submitFeedback.useMutation({
    onSuccess() {
      setServerError(null);
      setSubmitted(true);
    },
    onError(err) {
      setServerError(err.message);
    },
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setServerError(null);
      const payload: SubmitProjectFeedback = {
        projectId,
        rating: (rating ?? 0) as 1 | 2 | 3 | 4 | 5,
        selectedHook,
        preferredFormat,
        comments: comments.trim().length > 0 ? comments.trim() : undefined,
        wouldRecommend,
      };
      const parsed = submitProjectFeedbackInput.safeParse(payload);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        setServerError(first?.message ?? 'invalid');
        return;
      }
      submitFeedback.mutate(parsed.data);
    },
    [projectId, rating, selectedHook, preferredFormat, comments, wouldRecommend, submitFeedback],
  );

  return (
    <Card variant="elevated" className="flex flex-col gap-5 p-6" data-testid="feedback-form-card">
      <header className="flex flex-col gap-1">
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '18px',
            color: '#FFFFFF',
          }}
        >
          {t('feedbackTitle')}
        </h2>
      </header>

      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        aria-label={t('feedbackTitle')}
        style={{ display: 'grid', gap: '18px' }}
      >
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
          <legend style={labelStyle}>
            {t('ratingLabel')}{' '}
            <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)' }}>
              *
            </span>
          </legend>
          <div role="radiogroup" aria-label={t('ratingLabel')} style={radioRowStyle}>
            {RATING_VALUES.map((v) => {
              const active = rating === v;
              return (
                // biome-ignore lint/a11y/useSemanticElements: pill-radio canon ADR-050 (visual button styled as pill, behavior radio group).
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`rating-${v}`}
                  style={ratingPillStyle(active)}
                  onClick={() => {
                    setRating(v);
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
          <legend style={labelStyle}>{t('selectedHookLabel')}</legend>
          <div role="radiogroup" aria-label={t('selectedHookLabel')} style={radioRowStyle}>
            {(['hook_a', 'hook_b', 'hook_c'] as const).map((hook, idx) => {
              const active = selectedHook === hook;
              const labelKey = idx === 0 ? 'hookATab' : idx === 1 ? 'hookBTab' : 'hookCTab';
              return (
                // biome-ignore lint/a11y/useSemanticElements: pill-radio canon ADR-050 (visual button styled as pill, behavior radio group).
                <button
                  key={hook}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`hook-radio-${hook}`}
                  style={radioPillStyle(active)}
                  onClick={() => {
                    setSelectedHook(hook);
                  }}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
          <legend style={labelStyle}>{t('preferredFormatLabel')}</legend>
          <div role="radiogroup" aria-label={t('preferredFormatLabel')} style={radioRowStyle}>
            {FORMAT_VALUES.map((fmt) => {
              const active = preferredFormat === fmt;
              return (
                // biome-ignore lint/a11y/useSemanticElements: pill-radio canon ADR-050 (visual button styled as pill, behavior radio group).
                <button
                  key={fmt}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`format-radio-${fmt}`}
                  style={radioPillStyle(active)}
                  onClick={() => {
                    setPreferredFormat(fmt);
                  }}
                >
                  {fmt}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor={`${formId}-comments`} style={labelStyle}>
            {t('commentsLabel')}
          </label>
          <textarea
            id={`${formId}-comments`}
            value={comments}
            onChange={(e) => {
              setComments(e.target.value);
            }}
            maxLength={2000}
            style={textareaStyle}
            data-testid="feedback-comments"
          />
        </div>

        <label
          htmlFor={`${formId}-would-recommend`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--canon-cream-2)',
            cursor: 'pointer',
          }}
        >
          <input
            id={`${formId}-would-recommend`}
            type="checkbox"
            checked={wouldRecommend}
            onChange={(e) => {
              setWouldRecommend(e.target.checked);
            }}
            data-testid="would-recommend-toggle"
          />
          <span>{t('wouldRecommendLabel')}</span>
        </label>

        {serverError && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '10px 14px',
              background: 'rgba(244,63,94,0.10)',
              border: '1px solid rgba(244,63,94,0.30)',
              borderRadius: 'var(--canon-radius-pill)',
              fontSize: '13px',
              color: '#FCA5A5',
            }}
          >
            {serverError}
          </p>
        )}

        {submitted && (
          <p
            role="status"
            style={{
              margin: 0,
              padding: '10px 14px',
              background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.30)',
              borderRadius: 'var(--canon-radius-pill)',
              fontSize: '13px',
              color: '#86efac',
            }}
          >
            {t('feedbackSubmittedToast')}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={submitFeedback.isPending || submitted || rating === null}
          aria-busy={submitFeedback.isPending}
          data-testid="submit-feedback-button"
        >
          {submitFeedback.isPending ? `${t('submitFeedbackButton')}…` : t('submitFeedbackButton')}
        </Button>
      </form>
    </Card>
  );
}
