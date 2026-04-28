'use client';

// F14.F.10 Sprint 9 BIBLIA — White Label Settings (Plan Fotógrafo).
// Form custom_footer text + preview output con white-label aplicado.
// Plan validation: solo Foto plan tier paga upgrade ($+10/mes white-label).
// Slug-based URL H1; custom dominio H2 STUB ADR-018 4 señales.
// ADR-050 canon: pill buttons, brand gradient firma, motion ≤ 850ms.

import { type CSSProperties, type FormEvent, useCallback, useId, useState } from 'react';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

const FOOTER_MAX_LENGTH = 200;
const DEFAULT_DMX_FOOTER = 'Generado con DMX Studio';

export interface WhiteLabelSettingsProps {
  readonly initialEnabled?: boolean;
  readonly initialCustomFooter?: string;
  readonly slug: string;
  readonly onSave?: (input: { enabled: boolean; customFooter: string | null }) => Promise<void>;
  readonly saving?: boolean;
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  padding: '24px 28px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '20px',
  fontWeight: 800,
  color: 'var(--canon-cream)',
};

const subtitleStyle: CSSProperties = {
  fontSize: '13.5px',
  color: 'var(--canon-cream-2)',
  lineHeight: 1.55,
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--canon-cream)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '12px',
  padding: '12px 14px',
  fontSize: '14px',
  color: 'var(--canon-cream)',
  outline: 'none',
};

const previewBoxStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '18px 20px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: '14px',
};

const previewVideoMockStyle: CSSProperties = {
  position: 'relative',
  aspectRatio: '9 / 16',
  width: '180px',
  borderRadius: '14px',
  background: 'linear-gradient(180deg, #1F1B2E 0%, #0F0D17 100%)',
  border: '1px solid rgba(255,255,255,0.12)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  padding: '12px',
};

const footerOverlayStyle: CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.85)',
  textAlign: 'center',
  padding: '6px',
  background: 'rgba(0,0,0,0.45)',
  borderRadius: '8px',
  fontWeight: 500,
};

const togglePillStyle = (active: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: '9999px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid',
  transition: 'all 180ms ease',
  background: active ? 'linear-gradient(90deg, #6366F1, #EC4899)' : 'rgba(255,255,255,0.04)',
  color: active ? '#FFFFFF' : 'var(--canon-cream-2)',
  borderColor: active ? 'transparent' : 'rgba(255,255,255,0.14)',
});

const errorTextStyle: CSSProperties = {
  fontSize: '12px',
  color: '#fca5a5',
  marginTop: '4px',
};

const helperTextStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--canon-cream-3)',
};

export function WhiteLabelSettings({
  initialEnabled = false,
  initialCustomFooter = '',
  slug,
  onSave,
  saving = false,
}: WhiteLabelSettingsProps) {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [customFooter, setCustomFooter] = useState<string>(initialCustomFooter);
  const [validationError, setValidationError] = useState<string | null>(null);
  const footerInputId = useId();

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setValidationError(null);

      const trimmed = customFooter.trim();
      if (enabled && trimmed.length === 0) {
        setValidationError('Escribe un texto de footer para activar white-label.');
        return;
      }
      if (trimmed.length > FOOTER_MAX_LENGTH) {
        setValidationError(`Máximo ${FOOTER_MAX_LENGTH} caracteres.`);
        return;
      }

      if (onSave) {
        await onSave({
          enabled,
          customFooter: trimmed.length > 0 ? trimmed : null,
        });
      }
    },
    [customFooter, enabled, onSave],
  );

  const previewFooter =
    enabled && customFooter.trim().length > 0 ? customFooter.trim() : DEFAULT_DMX_FOOTER;
  const slugBasedUrl = `/studio/foto/${slug}`;

  return (
    <Card variant="elevated" style={sectionStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={titleStyle}>White-label</span>
          <DisclosurePill tone="amber">UPGRADE FOTO</DisclosurePill>
        </div>
        <span style={subtitleStyle}>
          Reemplaza el footer "Generado con DMX Studio" con tu propio texto. Tu marca aparece
          discreta al final de cada video que entregas.
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
      >
        <div style={fieldStyle}>
          <span style={labelStyle}>Estado</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setEnabled(true)}
              style={togglePillStyle(enabled)}
              aria-pressed={enabled}
            >
              Activado
            </button>
            <button
              type="button"
              onClick={() => setEnabled(false)}
              style={togglePillStyle(!enabled)}
              aria-pressed={!enabled}
            >
              Desactivado
            </button>
          </div>
        </div>

        <div style={fieldStyle}>
          <label htmlFor={footerInputId} style={labelStyle}>
            Footer personalizado
          </label>
          <input
            id={footerInputId}
            type="text"
            value={customFooter}
            onChange={(e) => setCustomFooter(e.target.value)}
            maxLength={FOOTER_MAX_LENGTH}
            placeholder="Ej: Manu Studio Fotografía"
            style={inputStyle}
            disabled={saving}
            aria-describedby={`${footerInputId}-helper`}
          />
          <span id={`${footerInputId}-helper`} style={helperTextStyle}>
            {customFooter.length}/{FOOTER_MAX_LENGTH} caracteres
          </span>
          {validationError ? <span style={errorTextStyle}>{validationError}</span> : null}
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>Vista previa</span>
          <div style={previewBoxStyle}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={previewVideoMockStyle}>
                <div style={footerOverlayStyle}>{previewFooter}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--canon-cream-3)',
                    textTransform: 'uppercase',
                  }}
                >
                  Footer aplicado
                </span>
                <span style={{ fontSize: '14px', color: 'var(--canon-cream)' }}>
                  {previewFooter}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--canon-cream-3)',
                    marginTop: '8px',
                    textTransform: 'uppercase',
                  }}
                >
                  URL de portfolio
                </span>
                <code
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '12px',
                    color: 'var(--canon-indigo-3)',
                    background: 'rgba(99,102,241,0.10)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    width: 'fit-content',
                  }}
                >
                  {slugBasedUrl}
                </code>
                {/* STUB ADR-018 4 señales (1/4 comentario): custom dominio H2.
                    Custom dominio (ej. videos.miestudio.com) requiere DNS verification +
                    SSL provisioning. activar H2 cuando founder valida demand.
                    Ver _README.md en este directorio para flip path. */}
                <button
                  type="button"
                  data-stub="adr-018"
                  data-stub-feature="custom-domain-h2"
                  aria-label="Conectar dominio personalizado (próximamente H2)"
                  disabled
                  style={{
                    marginTop: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    border: '1px dashed rgba(255,255,255,0.18)',
                    background: 'transparent',
                    color: 'var(--canon-cream-3)',
                    borderRadius: '9999px',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                    width: 'fit-content',
                  }}
                  // STUB ADR-018 4 señales (4/4 UI flag): aria-disabled + data-stub.
                  onClick={() => {
                    // STUB ADR-018 4 señales (2/4 throw): NOT_IMPLEMENTED H1.
                    throw new Error('NOT_IMPLEMENTED: custom_domain_h2_stub_adr_018');
                  }}
                >
                  Conectar dominio personalizado (H2)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button type="submit" variant="primary" size="md" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
