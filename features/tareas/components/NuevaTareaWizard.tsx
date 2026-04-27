'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import {
  type CreateTareaInput,
  createTareaInput,
  type TareaDetalleTipo,
  type TareaPriority,
  type TareaType,
  tareaTypeEnum,
} from '@/features/tareas/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon/button';
import { Card } from '@/shared/ui/primitives/canon/card';
import { DateTimePickerAbsolute } from '@/shared/ui/primitives/canon/date-time-picker-absolute';
import { DetalleTipoSelector } from './DetalleTipoSelector';
import { EntidadPicker } from './EntidadPicker';
import { PrioridadSelector } from './PrioridadSelector';

export interface NuevaTareaWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const inputStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  padding: '8px 14px',
  width: '100%',
};

const textareaStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 'var(--canon-radius-card)',
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  padding: '12px 14px',
  width: '100%',
  minHeight: 96,
  resize: 'vertical',
};

const labelStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

interface FormState {
  type: TareaType;
  entityId: string | undefined;
  entityLabel: string;
  title: string;
  detalleTipo: TareaDetalleTipo;
  description: string;
  dueAt: string;
  priority: TareaPriority;
  redirectTo: string;
}

const TYPES: readonly TareaType[] = tareaTypeEnum.options;

function defaultIsoTomorrow(): string {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return next.toISOString();
}

export function NuevaTareaWizard({ open, onClose, onCreated }: NuevaTareaWizardProps) {
  const t = useTranslations('Tareas');
  const utils = trpc.useUtils();
  const mutation = trpc.tareas.createTarea.useMutation({
    onSuccess: async () => {
      await utils.tareas.listTareas.invalidate();
      onCreated?.();
      onClose();
    },
  });

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(() => ({
    type: 'general',
    entityId: undefined,
    entityLabel: '',
    title: '',
    detalleTipo: 'custom',
    description: '',
    dueAt: defaultIsoTomorrow(),
    priority: 'media',
    redirectTo: '',
  }));
  const [error, setError] = useState<string | null>(null);

  const canAdvance = useMemo(() => {
    if (form.type === 'general') return true;
    return Boolean(form.entityId);
  }, [form.type, form.entityId]);

  const handleSubmit = useCallback(() => {
    setError(null);
    const candidate = {
      type: form.type,
      ...(form.entityId ? { entityId: form.entityId } : {}),
      title: form.title.trim(),
      detalleTipo: form.detalleTipo,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      dueAt: form.dueAt,
      priority: form.priority,
      ...(form.redirectTo.trim() ? { redirectTo: form.redirectTo.trim() } : {}),
    } satisfies Partial<CreateTareaInput> & { type: TareaType; title: string };
    const parsed = createTareaInput.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('wizard.errors.generic'));
      return;
    }
    mutation.mutate(parsed.data);
  }, [form, mutation, t]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('wizard.aria')}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(8,10,18,0.65)' }}
    >
      <Card
        variant="elevated"
        className="w-full max-w-xl flex-col gap-5 overflow-y-auto p-6"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
      >
        <div className="flex items-center justify-between">
          <h2
            style={{
              color: 'var(--canon-white-pure)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            {t(`wizard.step${step}.title`)}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('wizard.close')}>
            {t('wizard.close')}
          </Button>
        </div>
        <div
          aria-label={t('wizard.stepperAria')}
          className="flex items-center gap-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={step}
        >
          {[1, 2].map((index) => (
            <span
              key={index}
              style={{
                background:
                  index <= step
                    ? 'linear-gradient(90deg, #6366F1, #EC4899)'
                    : 'rgba(255,255,255,0.10)',
                borderRadius: 'var(--canon-radius-pill)',
                height: 4,
                flex: 1,
              }}
            />
          ))}
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span style={labelStyle}>{t('wizard.fields.type')}</span>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {TYPES.map((type) => {
                  const active = form.type === type;
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: radiogroup pattern with custom pill visuals; role+aria-checked are canonical
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          type,
                          entityId: type === 'general' ? undefined : prev.entityId,
                        }))
                      }
                      style={{
                        background: active ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.10)'}`,
                        borderRadius: 'var(--canon-radius-pill)',
                        color: active ? 'var(--canon-white-pure)' : 'var(--canon-cream)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 12.5,
                        fontWeight: active ? 600 : 500,
                        padding: '8px 12px',
                      }}
                    >
                      {t(`wizard.types.${type}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            {form.type !== 'general' ? (
              <div className="flex flex-col gap-2">
                <span style={labelStyle}>{t('wizard.fields.entity')}</span>
                <EntidadPicker
                  type={form.type}
                  value={form.entityId}
                  onChange={(id, label) =>
                    setForm((prev) => ({ ...prev, entityId: id, entityLabel: label }))
                  }
                />
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="md"
                disabled={!canAdvance}
                onClick={() => setStep(2)}
                aria-label={t('wizard.next')}
              >
                {t('wizard.next')}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="tarea-title" style={labelStyle}>
                {t('wizard.fields.title')}
              </label>
              <input
                id="tarea-title"
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                style={inputStyle}
                aria-label={t('wizard.fields.title')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span style={labelStyle}>{t('wizard.fields.detalleTipo')}</span>
              <DetalleTipoSelector
                value={form.detalleTipo}
                onChange={(detalleTipo) => setForm((prev) => ({ ...prev, detalleTipo }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="tarea-desc" style={labelStyle}>
                {t('wizard.fields.description')}
              </label>
              <textarea
                id="tarea-desc"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                style={textareaStyle}
                aria-label={t('wizard.fields.description')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span style={labelStyle}>{t('wizard.fields.dueAt')}</span>
              <DateTimePickerAbsolute
                value={form.dueAt}
                onChange={(dueAt) => setForm((prev) => ({ ...prev, dueAt }))}
                ariaLabelDate={t('wizard.fields.dueDateAria')}
                ariaLabelTime={t('wizard.fields.dueTimeAria')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span style={labelStyle}>{t('wizard.fields.priority')}</span>
              <PrioridadSelector
                value={form.priority}
                onChange={(priority) => setForm((prev) => ({ ...prev, priority }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="tarea-redirect" style={labelStyle}>
                {t('wizard.fields.redirectTo')}
              </label>
              <input
                id="tarea-redirect"
                type="text"
                value={form.redirectTo}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, redirectTo: event.target.value }))
                }
                placeholder={t('wizard.fields.redirectToPlaceholder')}
                style={inputStyle}
                aria-label={t('wizard.fields.redirectTo')}
              />
            </div>
            {error ? (
              <p style={{ color: '#fca5a5', fontSize: 12.5 }} role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setStep(1)}
                aria-label={t('wizard.back')}
              >
                {t('wizard.back')}
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={mutation.isPending || form.title.length < 3}
                onClick={handleSubmit}
                aria-label={t('wizard.submit')}
              >
                {mutation.isPending ? t('wizard.submitting') : t('wizard.submit')}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
