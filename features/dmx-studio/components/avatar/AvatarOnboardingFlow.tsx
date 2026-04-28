'use client';

// F14.F.8 Sprint 7 BIBLIA Tarea 7.1 + Upgrade 1 — Avatar onboarding 30s flow.
// 3 pasos: foto frontal → grabar 30s voz → confirm + trigger HeyGen.

import { type CSSProperties, useState } from 'react';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface AvatarOnboardingFlowProps {
  readonly onSubmit: (artifacts: {
    photoStoragePath: string;
    voiceSampleStoragePath: string;
    name: string;
  }) => Promise<void>;
  readonly disclosureLabel?: string;
}

const stepStyle: CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};
const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '20px',
  color: '#FFFFFF',
  lineHeight: 1.2,
};
const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.65)',
  lineHeight: 1.5,
};

export function AvatarOnboardingFlow({ onSubmit, disclosureLabel }: AvatarOnboardingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [photoPath, setPhotoPath] = useState<string>('');
  const [voicePath, setVoicePath] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!photoPath || !voicePath || !name) return;
    setSubmitting(true);
    try {
      await onSubmit({
        photoStoragePath: photoPath,
        voiceSampleStoragePath: voicePath,
        name,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card variant="elevated" aria-label="Avatar onboarding">
      <div style={stepStyle}>
        <div
          role="status"
          aria-live="polite"
          style={{ ...subtitleStyle, color: 'rgba(99,102,241,0.85)' }}
        >
          Paso {step} de 3
        </div>
        {step === 1 ? (
          <>
            <h2 style={titleStyle}>Sube una foto frontal</h2>
            <p style={subtitleStyle}>
              Necesitamos una foto clara, bien iluminada, mirando a cámara. PNG o JPG.
            </p>
            <input
              type="text"
              placeholder="Ruta storage foto (storage path)"
              value={photoPath}
              onChange={(e) => setPhotoPath(e.target.value)}
              aria-label="Photo storage path"
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
            <Button
              onClick={() => photoPath && setStep(2)}
              disabled={!photoPath}
              aria-label="Avanzar a paso 2"
            >
              Continuar
            </Button>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h2 style={titleStyle}>Graba 30 segundos de voz</h2>
            <p style={subtitleStyle}>
              Lee un guión natural durante 30s. Habla claro, mismo ambiente que tus reels.
            </p>
            <input
              type="text"
              placeholder="Ruta storage voz 30s (storage path)"
              value={voicePath}
              onChange={(e) => setVoicePath(e.target.value)}
              aria-label="Voice sample storage path"
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
            <Button
              onClick={() => voicePath && setStep(3)}
              disabled={!voicePath}
              aria-label="Avanzar a paso 3"
            >
              Continuar
            </Button>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <h2 style={titleStyle}>Confirma tu avatar</h2>
            <p style={subtitleStyle}>HeyGen procesará tu avatar en ~5-10 minutos.</p>
            <input
              type="text"
              placeholder="Nombre de tu avatar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Avatar name"
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting || !name}
              aria-label="Crear avatar"
              variant="primary"
            >
              {submitting ? 'Procesando…' : 'Crear avatar'}
            </Button>
          </>
        ) : null}
        {disclosureLabel ? (
          <p style={{ ...subtitleStyle, fontSize: '11px', marginTop: '8px' }}>{disclosureLabel}</p>
        ) : null}
      </div>
    </Card>
  );
}
