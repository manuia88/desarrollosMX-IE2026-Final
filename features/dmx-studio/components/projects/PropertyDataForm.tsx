'use client';

// FASE 14.F.2 Sprint 1 — Property data form for new project flow.
// Cross-function pre-fill via ?source=cross-function query string + tRPC suggestions.
// ADR-050 canon: pill inputs, recessed surfaces, brand gradient, motion ≤ 850ms.

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

export interface PropertyDataValues {
  readonly title: string;
  readonly description: string;
  readonly price: number | null;
  readonly currency: string;
  readonly areaM2: number | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly parking: number | null;
  readonly zone: string;
  readonly amenities: readonly string[];
  readonly captacionId: string | null;
  readonly proyectoId: string | null;
}

export interface PropertyDataFormProps {
  readonly value: PropertyDataValues;
  readonly onChange: (next: PropertyDataValues) => void;
  readonly disabled?: boolean;
}

const CURRENCIES = ['MXN', 'USD', 'COP', 'ARS', 'BRL', 'CLP', 'PEN'] as const;
type CurrencyCode = (typeof CURRENCIES)[number];

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

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '88px',
  padding: '12px 14px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
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

export const PROPERTY_DATA_DEFAULTS: PropertyDataValues = {
  title: '',
  description: '',
  price: null,
  currency: 'MXN',
  areaM2: null,
  bedrooms: null,
  bathrooms: null,
  parking: null,
  zone: '',
  amenities: [],
  captacionId: null,
  proyectoId: null,
};

export function PropertyDataForm({ value, onChange, disabled = false }: PropertyDataFormProps) {
  const t = useTranslations('Studio.projects.new');
  const formId = useId();
  const searchParams = useSearchParams();
  const isCrossFunction = searchParams?.get('source') === 'cross-function';

  const suggestions = trpc.studio.dashboard.getCrossFunctionSuggestions.useQuery(undefined, {
    enabled: isCrossFunction,
  });

  const [amenitiesText, setAmenitiesText] = useState<string>(value.amenities.join(', '));

  useEffect(() => {
    setAmenitiesText(value.amenities.join(', '));
  }, [value.amenities]);

  const update = useCallback(
    (patch: Partial<PropertyDataValues>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value],
  );

  const handleAmenitiesBlur = useCallback(() => {
    const list = amenitiesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 20);
    update({ amenities: list });
  }, [amenitiesText, update]);

  const handleSelectCaptacion = useCallback(
    (captacionId: string) => {
      const captaciones = suggestions.data?.captaciones ?? [];
      const found = captaciones.find((c) => c.id === captacionId);
      if (!found) {
        update({ captacionId: null });
        return;
      }
      update({
        captacionId: found.id,
        title: value.title || found.direccion || '',
        zone: found.ciudad ?? value.zone,
        price: typeof found.precioSolicitado === 'number' ? found.precioSolicitado : value.price,
      });
    },
    [suggestions.data?.captaciones, update, value.price, value.title, value.zone],
  );

  const captaciones = useMemo(
    () => suggestions.data?.captaciones ?? [],
    [suggestions.data?.captaciones],
  );

  return (
    <section
      aria-label={t('propertyDataTitle')}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3
          className="font-[var(--font-display)] text-base font-bold"
          style={{ color: '#FFFFFF', margin: 0 }}
        >
          {t('propertyDataTitle')}
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--canon-cream-2)' }}>
          {t('propertyDataSubtitle')}
        </p>
      </header>

      {isCrossFunction && (
        <div style={{ display: 'grid', gap: '6px' }} data-testid="cross-function-picker">
          <label htmlFor={`${formId}-captacion`} style={labelStyle}>
            {t('crossFunctionPickerLabel')}
          </label>
          <select
            id={`${formId}-captacion`}
            value={value.captacionId ?? ''}
            onChange={(e) => handleSelectCaptacion(e.target.value)}
            disabled={disabled || suggestions.isLoading}
            style={inputStyle}
          >
            <option value="">{t('crossFunctionPickerPlaceholder')}</option>
            {captaciones.length === 0 && !suggestions.isLoading && (
              <option disabled value="__empty">
                {t('crossFunctionPickerEmpty')}
              </option>
            )}
            {captaciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.direccion ?? c.id} — {c.ciudad ?? ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gap: '6px' }}>
        <label htmlFor={`${formId}-title`} style={labelStyle}>
          {t('propertyTitleLabel')}{' '}
          <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)' }}>
            *
          </span>
        </label>
        <input
          id={`${formId}-title`}
          type="text"
          value={value.title}
          onChange={(e) => update({ title: e.target.value })}
          required
          maxLength={180}
          minLength={3}
          aria-required="true"
          placeholder={t('propertyTitlePlaceholder')}
          disabled={disabled}
          style={inputStyle}
          data-testid="property-title"
        />
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        <label htmlFor={`${formId}-description`} style={labelStyle}>
          {t('propertyDescriptionLabel')}
        </label>
        <textarea
          id={`${formId}-description`}
          value={value.description}
          onChange={(e) => update({ description: e.target.value })}
          maxLength={2000}
          placeholder={t('propertyDescriptionPlaceholder')}
          disabled={disabled}
          style={textareaStyle}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor={`${formId}-price`} style={labelStyle}>
            {t('propertyPriceLabel')}
          </label>
          <input
            id={`${formId}-price`}
            type="number"
            inputMode="decimal"
            min={0}
            value={value.price ?? ''}
            onChange={(e) => update({ price: parseNumberOrNull(e.target.value) })}
            disabled={disabled}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor={`${formId}-currency`} style={labelStyle}>
            {t('propertyCurrencyLabel')}
          </label>
          <select
            id={`${formId}-currency`}
            value={value.currency}
            onChange={(e) => update({ currency: e.target.value as CurrencyCode })}
            disabled={disabled}
            style={inputStyle}
          >
            {CURRENCIES.map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor={`${formId}-area`} style={labelStyle}>
            {t('propertyAreaLabel')}
          </label>
          <input
            id={`${formId}-area`}
            type="number"
            inputMode="decimal"
            min={0}
            value={value.areaM2 ?? ''}
            onChange={(e) => update({ areaM2: parseNumberOrNull(e.target.value) })}
            disabled={disabled}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor={`${formId}-bedrooms`} style={labelStyle}>
            {t('propertyBedroomsLabel')}
          </label>
          <input
            id={`${formId}-bedrooms`}
            type="number"
            inputMode="numeric"
            min={0}
            value={value.bedrooms ?? ''}
            onChange={(e) => update({ bedrooms: parseNumberOrNull(e.target.value) })}
            disabled={disabled}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor={`${formId}-bathrooms`} style={labelStyle}>
            {t('propertyBathroomsLabel')}
          </label>
          <input
            id={`${formId}-bathrooms`}
            type="number"
            inputMode="decimal"
            min={0}
            value={value.bathrooms ?? ''}
            onChange={(e) => update({ bathrooms: parseNumberOrNull(e.target.value) })}
            disabled={disabled}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor={`${formId}-parking`} style={labelStyle}>
            {t('propertyParkingLabel')}
          </label>
          <input
            id={`${formId}-parking`}
            type="number"
            inputMode="numeric"
            min={0}
            value={value.parking ?? ''}
            onChange={(e) => update({ parking: parseNumberOrNull(e.target.value) })}
            disabled={disabled}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        <label htmlFor={`${formId}-zone`} style={labelStyle}>
          {t('propertyZoneLabel')}
        </label>
        <input
          id={`${formId}-zone`}
          type="text"
          value={value.zone}
          onChange={(e) => update({ zone: e.target.value })}
          maxLength={120}
          disabled={disabled}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        <label htmlFor={`${formId}-amenities`} style={labelStyle}>
          {t('propertyAmenitiesLabel')}
        </label>
        <input
          id={`${formId}-amenities`}
          type="text"
          value={amenitiesText}
          onChange={(e) => setAmenitiesText(e.target.value)}
          onBlur={handleAmenitiesBlur}
          placeholder={t('propertyAmenitiesPlaceholder')}
          disabled={disabled}
          style={inputStyle}
        />
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--canon-cream-2)' }}>
          {t('propertyAmenitiesHelp')}
        </p>
      </div>
    </section>
  );
}
