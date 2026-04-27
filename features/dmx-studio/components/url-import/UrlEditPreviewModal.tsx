'use client';

// FASE 14.F.4 Sprint 3 — Edit extracted data before confirming.
// Pre-llena form con data extraída + permite override antes de confirmAndCreateProject.
// ADR-050 canon: pill inputs, recessed surfaces, brand gradient submit button.

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface UrlEditPreviewInitialValues {
  readonly title: string;
  readonly price: number | null;
  readonly areaM2: number | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly zone: string;
}

export interface UrlEditPreviewModalProps {
  readonly importId: string;
  readonly open: boolean;
  readonly initial: UrlEditPreviewInitialValues;
  readonly onClose: () => void;
  readonly onCreated?: (projectId: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '42px',
  padding: '0 14px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.01em',
};

function parseNumberOrNull(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function UrlEditPreviewModal({
  importId,
  open,
  initial,
  onClose,
  onCreated,
}: UrlEditPreviewModalProps) {
  const t = useTranslations('Studio.urlImport');
  const titleId = useId();
  const priceId = useId();
  const areaId = useId();
  const bedroomsId = useId();
  const bathroomsId = useId();
  const zoneId = useId();
  const dialogTitleId = useId();

  const [title, setTitle] = useState<string>(initial.title);
  const [price, setPrice] = useState<string>(initial.price !== null ? String(initial.price) : '');
  const [areaM2, setAreaM2] = useState<string>(
    initial.areaM2 !== null ? String(initial.areaM2) : '',
  );
  const [bedrooms, setBedrooms] = useState<string>(
    initial.bedrooms !== null ? String(initial.bedrooms) : '',
  );
  const [bathrooms, setBathrooms] = useState<string>(
    initial.bathrooms !== null ? String(initial.bathrooms) : '',
  );
  const [zone, setZone] = useState<string>(initial.zone);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initial.title);
      setPrice(initial.price !== null ? String(initial.price) : '');
      setAreaM2(initial.areaM2 !== null ? String(initial.areaM2) : '');
      setBedrooms(initial.bedrooms !== null ? String(initial.bedrooms) : '');
      setBathrooms(initial.bathrooms !== null ? String(initial.bathrooms) : '');
      setZone(initial.zone);
      setError(null);
    }
  }, [open, initial]);

  const confirmMutation = trpc.studio.urlImport.confirmAndCreateProject.useMutation();

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 3) {
        setError(t('errorTitleMin'));
        return;
      }
      const priceNum = parseNumberOrNull(price);
      const areaNum = parseNumberOrNull(areaM2);
      const bedroomsNum = parseNumberOrNull(bedrooms);
      const bathroomsNum = parseNumberOrNull(bathrooms);
      const trimmedZone = zone.trim();
      try {
        const result = await confirmMutation.mutateAsync({
          importId,
          title: trimmedTitle,
          overrides: {
            ...(priceNum !== null ? { price: priceNum } : {}),
            ...(areaNum !== null ? { areaM2: areaNum } : {}),
            ...(bedroomsNum !== null ? { bedrooms: bedroomsNum } : {}),
            ...(bathroomsNum !== null ? { bathrooms: bathroomsNum } : {}),
            ...(trimmedZone.length > 0 ? { zone: trimmedZone } : {}),
          },
        });
        if (onCreated) onCreated(result.projectId);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errorUnknown');
        setError(message);
      }
    },
    [
      areaM2,
      bathrooms,
      bedrooms,
      confirmMutation,
      importId,
      onClose,
      onCreated,
      price,
      t,
      title,
      zone,
    ],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      data-testid="url-edit-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,9,12,0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <Card
        variant="spotlight"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2
            id={dialogTitleId}
            className="font-[var(--font-display)] text-xl font-extrabold tracking-tight"
            style={{ color: '#FFFFFF', margin: 0 }}
          >
            {t('editModalTitle')}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--canon-cream-2)',
              lineHeight: 1.55,
            }}
          >
            {t('editModalSubtitle')}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={titleId} style={labelStyle}>
              {t('editTitleLabel')}
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              required
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor={priceId} style={labelStyle}>
                {t('editPriceLabel')}
              </label>
              <input
                id={priceId}
                type="number"
                inputMode="decimal"
                min={0}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor={areaId} style={labelStyle}>
                {t('editAreaLabel')}
              </label>
              <input
                id={areaId}
                type="number"
                inputMode="decimal"
                min={0}
                value={areaM2}
                onChange={(event) => setAreaM2(event.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor={bedroomsId} style={labelStyle}>
                {t('editBedroomsLabel')}
              </label>
              <input
                id={bedroomsId}
                type="number"
                inputMode="numeric"
                min={0}
                value={bedrooms}
                onChange={(event) => setBedrooms(event.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor={bathroomsId} style={labelStyle}>
                {t('editBathroomsLabel')}
              </label>
              <input
                id={bathroomsId}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                value={bathrooms}
                onChange={(event) => setBathrooms(event.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor={zoneId} style={labelStyle}>
              {t('editZoneLabel')}
            </label>
            <input
              id={zoneId}
              type="text"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              maxLength={120}
              style={inputStyle}
            />
          </div>

          {error && (
            <p
              role="alert"
              data-testid="url-edit-modal-error"
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={confirmMutation.isPending}
            >
              {t('cancelCta')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={confirmMutation.isPending}
              aria-busy={confirmMutation.isPending}
              data-testid="url-edit-modal-submit"
            >
              {confirmMutation.isPending ? t('savingCta') : t('saveCta')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
