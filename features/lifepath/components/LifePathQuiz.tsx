'use client';

// BLOQUE 11.O.2.3 — LifePath quiz multi-step (3 pasos × 5 preguntas).
// Form controlado + Zod validation + tRPC mutation authenticated.

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type FormEvent, useMemo, useState } from 'react';
import { lifepathAnswersSchema } from '@/features/lifepath/schemas/lifepath';
import {
  FAMILY_STATES,
  HORIZON_OPTIONS,
  INCOME_RANGES,
  type LifePathAnswers,
  MOBILITY_PREFS,
  VIBE_PACES,
  WORK_MODES,
} from '@/features/lifepath/types';
import { trpc } from '@/shared/lib/trpc/client';

interface LifePathQuizProps {
  readonly locale: string;
}

type FormState = {
  family_state: LifePathAnswers['family_state'] | '';
  family_priority: number;
  income_range: LifePathAnswers['income_range'] | '';
  budget_monthly_mxn: number | '';
  work_mode: LifePathAnswers['work_mode'] | '';
  mobility_pref: LifePathAnswers['mobility_pref'] | '';
  amenities_priority: number;
  shopping_priority: number;
  security_priority: number;
  green_priority: number;
  vibe_pace: LifePathAnswers['vibe_pace'] | '';
  vibe_nightlife: number;
  vibe_walkable: number;
  has_pet: boolean;
  horizon: LifePathAnswers['horizon'] | '';
};

const INITIAL: FormState = {
  family_state: '',
  family_priority: 5,
  income_range: '',
  budget_monthly_mxn: '',
  work_mode: '',
  mobility_pref: '',
  amenities_priority: 5,
  shopping_priority: 5,
  security_priority: 7,
  green_priority: 5,
  vibe_pace: '',
  vibe_nightlife: 5,
  vibe_walkable: 5,
  has_pet: false,
  horizon: '',
};

type SubmitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'error'; readonly message: string };

export function LifePathQuiz({ locale }: LifePathQuizProps) {
  const t = useTranslations('LifePath.quiz');
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [state, setState] = useState<FormState>(INITIAL);
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' });

  const saveProfile = trpc.lifepath.saveProfile.useMutation();

  const progress = useMemo(() => Math.round(((step + 1) / 3) * 100), [step]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function canContinueStep0(): boolean {
    return state.family_state !== '' && state.income_range !== '' && state.work_mode !== '';
  }

  function canContinueStep1(): boolean {
    return state.mobility_pref !== '';
  }

  function buildAnswers(): LifePathAnswers | null {
    const candidate = {
      family_state: state.family_state,
      family_priority: state.family_priority,
      income_range: state.income_range,
      budget_monthly_mxn: state.budget_monthly_mxn === '' ? null : Number(state.budget_monthly_mxn),
      work_mode: state.work_mode,
      mobility_pref: state.mobility_pref,
      amenities_priority: state.amenities_priority,
      shopping_priority: state.shopping_priority,
      security_priority: state.security_priority,
      green_priority: state.green_priority,
      vibe_pace: state.vibe_pace,
      vibe_nightlife: state.vibe_nightlife,
      vibe_walkable: state.vibe_walkable,
      has_pet: state.has_pet,
      horizon: state.horizon,
    };
    const parsed = lifepathAnswersSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answers = buildAnswers();
    if (!answers) {
      setSubmit({ kind: 'error', message: t('validation_error') });
      return;
    }
    setSubmit({ kind: 'submitting' });
    try {
      await saveProfile.mutateAsync({ answers });
      router.push(`/${locale}/lifepath/resultados`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('submit_error');
      setSubmit({ kind: 'error', message: msg });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('progress_aria')}
        className="h-1.5 w-full overflow-hidden rounded bg-[color:var(--color-border-subtle)]"
      >
        <div
          className="h-full bg-[color:var(--color-accent)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[color:var(--color-text-secondary)]">
        {t('step_indicator', { current: step + 1, total: 3 })}
      </p>

      {step === 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('step1_title')}</h2>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('q_family_state')}</legend>
            {FAMILY_STATES.map((v) => (
              <label key={v} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="family_state"
                  value={v}
                  checked={state.family_state === v}
                  onChange={() => update('family_state', v)}
                />
                {t(`family_state_${v}`)}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t('q_family_priority')}: {state.family_priority}
            </legend>
            <input
              type="range"
              min={0}
              max={10}
              value={state.family_priority}
              onChange={(e) => update('family_priority', Number(e.target.value))}
              className="w-full"
              aria-label={t('q_family_priority')}
            />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('q_income_range')}</legend>
            <select
              value={state.income_range}
              onChange={(e) =>
                update('income_range', e.target.value as LifePathAnswers['income_range'] | '')
              }
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm"
            >
              <option value="">{t('select_placeholder')}</option>
              {INCOME_RANGES.map((v) => (
                <option key={v} value={v}>
                  {t(`income_range_${v}`)}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('q_budget_monthly')}</legend>
            <input
              type="number"
              min={0}
              max={10_000_000}
              step={1000}
              value={state.budget_monthly_mxn}
              onChange={(e) =>
                update(
                  'budget_monthly_mxn',
                  e.target.value === '' ? '' : Number.parseInt(e.target.value, 10),
                )
              }
              placeholder={t('q_budget_placeholder')}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm"
            />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('q_work_mode')}</legend>
            {WORK_MODES.map((v) => (
              <label key={v} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="work_mode"
                  value={v}
                  checked={state.work_mode === v}
                  onChange={() => update('work_mode', v)}
                />
                {t(`work_mode_${v}`)}
              </label>
            ))}
          </fieldset>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('step2_title')}</h2>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('q_mobility_pref')}</legend>
            {MOBILITY_PREFS.map((v) => (
              <label key={v} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mobility_pref"
                  value={v}
                  checked={state.mobility_pref === v}
                  onChange={() => update('mobility_pref', v)}
                />
                {t(`mobility_pref_${v}`)}
              </label>
            ))}
          </fieldset>
          {(
            [
              ['amenities_priority', 'q_amenities_priority'],
              ['shopping_priority', 'q_shopping_priority'],
              ['security_priority', 'q_security_priority'],
              ['green_priority', 'q_green_priority'],
            ] as const
          ).map(([key, i18nKey]) => (
            <fieldset key={key} className="space-y-2">
              <legend className="text-sm font-medium">
                {t(i18nKey)}: {state[key]}
              </legend>
              <input
                type="range"
                min={0}
                max={10}
                value={state[key]}
                onChange={(e) => update(key, Number(e.target.value))}
                className="w-full"
                aria-label={t(i18nKey)}
              />
            </fieldset>
          ))}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('step3_title')}</h2>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('q_vibe_pace')}</legend>
            {VIBE_PACES.map((v) => (
              <label key={v} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="vibe_pace"
                  value={v}
                  checked={state.vibe_pace === v}
                  onChange={() => update('vibe_pace', v)}
                />
                {t(`vibe_pace_${v}`)}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t('q_vibe_nightlife')}: {state.vibe_nightlife}
            </legend>
            <input
              type="range"
              min={0}
              max={10}
              value={state.vibe_nightlife}
              onChange={(e) => update('vibe_nightlife', Number(e.target.value))}
              className="w-full"
              aria-label={t('q_vibe_nightlife')}
            />
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t('q_vibe_walkable')}: {state.vibe_walkable}
            </legend>
            <input
              type="range"
              min={0}
              max={10}
              value={state.vibe_walkable}
              onChange={(e) => update('vibe_walkable', Number(e.target.value))}
              className="w-full"
              aria-label={t('q_vibe_walkable')}
            />
          </fieldset>
          <fieldset className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.has_pet}
                onChange={(e) => update('has_pet', e.target.checked)}
              />
              {t('q_has_pet')}
            </label>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('q_horizon')}</legend>
            <select
              value={state.horizon}
              onChange={(e) => update('horizon', e.target.value as LifePathAnswers['horizon'] | '')}
              className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm"
            >
              <option value="">{t('select_placeholder')}</option>
              {HORIZON_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {t(`horizon_${v}`)}
                </option>
              ))}
            </select>
          </fieldset>
        </section>
      ) : null}

      {submit.kind === 'error' ? (
        <p role="alert" className="text-sm text-[color:var(--color-danger)]">
          {submit.message}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0 || submit.kind === 'submitting'}
          onClick={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s))}
          className="rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm disabled:opacity-40"
        >
          {t('back_button')}
        </button>
        {step < 2 ? (
          <button
            type="button"
            disabled={step === 0 ? !canContinueStep0() : !canContinueStep1()}
            onClick={() => setStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s))}
            className="rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-[color:var(--color-on-accent)] disabled:opacity-40"
          >
            {t('next_button')}
          </button>
        ) : (
          <button
            type="submit"
            disabled={
              submit.kind === 'submitting' || state.vibe_pace === '' || state.horizon === ''
            }
            className="rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--color-on-accent)] disabled:opacity-40"
          >
            {submit.kind === 'submitting' ? t('submitting') : t('submit_button')}
          </button>
        )}
      </div>
    </form>
  );
}

export default LifePathQuiz;
