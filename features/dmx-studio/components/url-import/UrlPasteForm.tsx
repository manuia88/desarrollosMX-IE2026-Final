'use client';

// FASE 14.F.4 Sprint 3 — Bulk URL paste form (1-10 URLs).
// Auto-detect portal + per-portal badge color. Submit invokes
// trpc.studio.urlImport.bulkParseUrls mutation. Async worker scrapes per URL.
// ADR-050 canon: pill buttons, brand gradient, glass surfaces, translateY only.

import { useTranslations } from 'next-intl';
import { useCallback, useId, useMemo, useState } from 'react';
import { detectPortal } from '@/features/dmx-studio/lib/url-import/portal-parsers/generic';
import type { StudioPortal } from '@/features/dmx-studio/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

const MAX_URLS = 10;

const PORTAL_BADGE_COLORS: Record<StudioPortal, { bg: string; fg: string }> = {
  inmuebles24: { bg: 'rgba(244,114,182,0.14)', fg: '#F472B6' },
  lamudi: { bg: 'rgba(99,102,241,0.16)', fg: '#A5B4FC' },
  easybroker: { bg: 'rgba(16,185,129,0.14)', fg: '#6EE7B7' },
  vivanuncios: { bg: 'rgba(245,158,11,0.14)', fg: '#FCD34D' },
  segundamano: { bg: 'rgba(168,85,247,0.14)', fg: '#C4B5FD' },
  propiedades_com: { bg: 'rgba(56,189,248,0.14)', fg: '#7DD3FC' },
  manual_url: { bg: 'rgba(255,255,255,0.06)', fg: 'var(--canon-cream-2)' },
  unknown: { bg: 'rgba(244,63,94,0.10)', fg: '#FCA5A5' },
};

export interface UrlPasteFormProps {
  readonly onBatchSubmitted?: (batchId: string, importIds: ReadonlyArray<string>) => void;
  readonly disabled?: boolean;
}

interface ParsedRow {
  readonly raw: string;
  readonly portal: StudioPortal;
  readonly valid: boolean;
}

function parseLines(value: string): ReadonlyArray<ParsedRow> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map<ParsedRow>((line) => {
      try {
        const url = new URL(line);
        const validProtocol = url.protocol === 'http:' || url.protocol === 'https:';
        return {
          raw: line,
          portal: detectPortal(line),
          valid: validProtocol,
        };
      } catch {
        return { raw: line, portal: 'unknown', valid: false };
      }
    });
}

export function UrlPasteForm({ onBatchSubmitted, disabled }: UrlPasteFormProps) {
  const t = useTranslations('Studio.urlImport');
  const textareaId = useId();
  const helpId = useId();

  const [value, setValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const bulkMutation = trpc.studio.urlImport.bulkParseUrls.useMutation();

  const rows = useMemo<ReadonlyArray<ParsedRow>>(() => parseLines(value), [value]);
  const validCount = rows.filter((r) => r.valid).length;
  const overLimit = rows.length > MAX_URLS;
  const canSubmit = !disabled && !bulkMutation.isPending && validCount > 0 && !overLimit;

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      const urls = rows.filter((r) => r.valid).map((r) => r.raw);
      if (urls.length === 0) {
        setError(t('errorEmpty'));
        return;
      }
      if (urls.length > MAX_URLS) {
        setError(t('errorMax', { max: MAX_URLS }));
        return;
      }
      try {
        const result = await bulkMutation.mutateAsync({ urls });
        if (onBatchSubmitted) onBatchSubmitted(result.batchId, result.importIds);
        setValue('');
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errorUnknown');
        setError(message);
      }
    },
    [bulkMutation, onBatchSubmitted, rows, t],
  );

  return (
    <Card
      variant="elevated"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h2
          className="font-[var(--font-display)] text-2xl font-extrabold tracking-tight"
          style={{ color: '#FFFFFF', margin: 0 }}
        >
          {t('formTitle')}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--canon-cream-2)',
            lineHeight: 1.55,
          }}
        >
          {t('formSubtitle', { max: MAX_URLS })}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <label
          htmlFor={textareaId}
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--canon-cream-2)',
            letterSpacing: '0.01em',
          }}
        >
          {t('textareaLabel')}
        </label>
        <textarea
          id={textareaId}
          aria-describedby={helpId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t('textareaPlaceholder')}
          disabled={disabled || bulkMutation.isPending}
          rows={6}
          style={{
            width: '100%',
            minHeight: '140px',
            padding: '12px 14px',
            background: 'var(--surface-recessed)',
            border: '1px solid var(--canon-border)',
            borderRadius: 'var(--canon-radius-card)',
            color: 'var(--canon-cream)',
            fontSize: '13.5px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            outline: 'none',
            resize: 'vertical',
          }}
        />
        <p
          id={helpId}
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--canon-cream-2)',
          }}
        >
          {t('countHelp', { current: validCount, max: MAX_URLS })}
        </p>

        {rows.length > 0 && (
          <ul
            aria-label={t('detectedListLabel')}
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {rows.map((row) => {
              const palette = PORTAL_BADGE_COLORS[row.portal];
              return (
                <li
                  key={`${row.raw}-${row.portal}-${row.valid ? 'v' : 'i'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: 'var(--surface-recessed)',
                    border: `1px solid ${row.valid ? 'var(--canon-border)' : 'rgba(244,63,94,0.30)'}`,
                    borderRadius: 'var(--canon-radius-pill)',
                  }}
                >
                  <span
                    role="img"
                    aria-label={t('portalLabel', { portal: row.portal })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 10px',
                      background: palette.bg,
                      color: palette.fg,
                      borderRadius: 'var(--canon-radius-pill)',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t(`portal.${row.portal}` as never)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: '12.5px',
                      color: row.valid ? 'var(--canon-cream)' : '#FCA5A5',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                  >
                    {row.raw}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {overLimit && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '10px 14px',
              background: 'rgba(244,63,94,0.10)',
              border: '1px solid rgba(244,63,94,0.30)',
              borderRadius: 'var(--canon-radius-card)',
              fontSize: '13px',
              color: '#FCA5A5',
            }}
          >
            {t('errorMax', { max: MAX_URLS })}
          </p>
        )}

        {error && (
          <p
            role="alert"
            data-testid="url-paste-error"
            style={{
              margin: 0,
              padding: '10px 14px',
              background: 'rgba(244,63,94,0.10)',
              border: '1px solid rgba(244,63,94,0.30)',
              borderRadius: 'var(--canon-radius-card)',
              fontSize: '13px',
              color: '#FCA5A5',
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            aria-busy={bulkMutation.isPending}
            data-testid="url-paste-submit"
          >
            {bulkMutation.isPending ? t('submittingCta') : t('submitCta')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
