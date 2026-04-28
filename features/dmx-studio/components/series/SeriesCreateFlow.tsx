'use client';

// F14.F.9 Sprint 8 BIBLIA Tarea 8.1 — Series create flow 4 steps.
import { useRouter } from 'next/navigation';
import { type CSSProperties, useState } from 'react';
import { TemplateSelector } from '@/features/dmx-studio/components/series-templates/TemplateSelector';
import { trpc } from '@/shared/lib/trpc/client';

export interface SeriesCreateFlowProps {
  readonly locale: string;
  readonly defaultDesarrolloId?: string;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 28,
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: 14,
  marginTop: 4,
};

const stepIndicator: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 24,
};

const dotStyle = (active: boolean): CSSProperties => ({
  width: 32,
  height: 4,
  borderRadius: 9999,
  background: active ? 'linear-gradient(90deg, #6366F1, #EC4899)' : 'var(--canon-border)',
});

const inputStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 12,
  padding: '12px 16px',
  color: '#FFFFFF',
  fontSize: 14,
  width: '100%',
  fontFamily: 'var(--font-sans)',
};

const ctaStyle: CSSProperties = {
  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 9999,
  padding: '12px 24px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const ghostStyle: CSSProperties = {
  ...ctaStyle,
  background: 'transparent',
  border: '1px solid var(--canon-border)',
  color: 'var(--canon-cream)',
};

export function SeriesCreateFlow({ locale, defaultDesarrolloId }: SeriesCreateFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [autoProgress, setAutoProgress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const createMutation = trpc.studio.sprint8Series.create.useMutation();

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const input: Parameters<typeof createMutation.mutateAsync>[0] = {
        title: title.trim(),
        enableAutoProgress: autoProgress,
      };
      if (description.trim()) input.description = description.trim();
      if (templateId) input.templateId = templateId;
      if (defaultDesarrolloId) input.desarrolloId = defaultDesarrolloId;
      const result = await createMutation.mutateAsync(input);
      router.push(`/${locale}/studio-app/series/${result.seriesId}`);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={stepIndicator}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={dotStyle(s === step)} />
        ))}
      </div>

      {step === 1 ? (
        <section>
          <h2 style={headingStyle}>Tu nueva serie documental</h2>
          <p style={subtitleStyle}>Cuéntanos de qué tratará tu serie. 5 episodios canon.</p>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              aria-label="Titulo de la serie"
              placeholder="Ej: Torre Reforma — Documental"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
            <textarea
              aria-label="Descripcion (opcional)"
              placeholder="Descripción opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            />
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <h2 style={headingStyle}>Selecciona template</h2>
          <p style={subtitleStyle}>Estructuras canon o crea custom asistido por IA.</p>
          <div style={{ marginTop: 24 }}>
            <TemplateSelector selectedId={templateId} onSelect={setTemplateId} />
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <h2 style={headingStyle}>Revisa el arco narrativo</h2>
          <p style={subtitleStyle}>
            {templateId
              ? 'Template canon seleccionado. Generaremos los episodios al confirmar.'
              : 'Modo custom: Claude generará un arco personalizado al confirmar.'}
          </p>
        </section>
      ) : null}

      {step === 4 ? (
        <section>
          <h2 style={headingStyle}>¿Activar generación automática?</h2>
          <p style={subtitleStyle}>
            Cuando la obra avance fase, sugerimos grabar el siguiente episodio.
          </p>
          <label
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginTop: 24,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={autoProgress}
              onChange={(e) => setAutoProgress(e.target.checked)}
            />
            <span style={{ color: '#FFFFFF', fontSize: 14 }}>Sí, activar auto-trigger</span>
          </label>
        </section>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        {step > 1 ? (
          <button type="button" onClick={prev} style={ghostStyle}>
            Atrás
          </button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <button type="button" onClick={next} style={ctaStyle} disabled={step === 1 && !title}>
            Continuar
          </button>
        ) : (
          <button type="button" onClick={submit} style={ctaStyle} disabled={submitting}>
            {submitting ? 'Creando...' : 'Crear serie'}
          </button>
        )}
      </div>
    </div>
  );
}
