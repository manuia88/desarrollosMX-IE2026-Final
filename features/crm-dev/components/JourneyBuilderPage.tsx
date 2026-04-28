'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useMemo, useState } from 'react';
import { Button, Card } from '@/shared/ui/primitives/canon';
import {
  useCreateJourney,
  useDevJourneys,
  useInvalidateCrmDevQueries,
  usePauseJourney,
} from '../hooks/use-crm-dev';
import { JOURNEY_TEMPLATES } from '../lib/journey-templates';
import {
  JOURNEY_STEP_TYPES,
  JOURNEY_TRIGGER_EVENTS,
  type JourneyStep,
  type JourneyTriggerEvent,
} from '../schemas';
import { JourneyStepRow } from './JourneyStepRow';

export interface JourneyBuilderPageProps {
  readonly locale: string;
}

export function JourneyBuilderPage({ locale }: JourneyBuilderPageProps) {
  const t = useTranslations('dev.crm.journey');
  const list = useDevJourneys({});
  const create = useCreateJourney();
  const pause = usePauseJourney();
  const invalidate = useInvalidateCrmDevQueries();
  const [showBuilder, setShowBuilder] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftTrigger, setDraftTrigger] = useState<JourneyTriggerEvent>('lead_created');
  const [draftSteps, setDraftSteps] = useState<JourneyStep[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 12,
    borderBottom: '1px solid var(--canon-border)',
    marginBottom: 14,
  };

  const layoutStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
    gap: 18,
  };

  const handleCreateFromTemplate = async (slug: string) => {
    const tmpl = JOURNEY_TEMPLATES.find((tt) => tt.slug === slug);
    if (!tmpl) return;
    setCreateError(null);
    try {
      await create.mutateAsync({
        name: t(`templates.${tmpl.slug}.name`),
        triggerEvent: tmpl.triggerEvent,
        audienceFilter: tmpl.audienceFilter,
        steps: tmpl.steps as readonly JourneyStep[] as JourneyStep[],
      });
      invalidate.invalidateJourneys();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveDraft = async () => {
    if (draftName.trim().length === 0 || draftSteps.length === 0) return;
    setCreateError(null);
    try {
      await create.mutateAsync({
        name: draftName.trim(),
        triggerEvent: draftTrigger,
        audienceFilter: {},
        steps: draftSteps,
      });
      invalidate.invalidateJourneys();
      setShowBuilder(false);
      setDraftName('');
      setDraftSteps([]);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  };

  const journeys = useMemo(() => list.data ?? [], [list.data]);

  return (
    <main style={{ padding: '24px 28px 80px' }}>
      <header style={headerStyle}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--canon-cream)',
              margin: 0,
            }}
          >
            {t('page.title')}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--canon-cream-2)',
              margin: '2px 0 0',
            }}
          >
            {t('page.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/desarrolladores/crm`}>{t('page.backToCRM')}</Link>
          </Button>
          <Button type="button" size="sm" onClick={() => setShowBuilder((s) => !s)}>
            {showBuilder ? t('page.cancelBuilder') : t('page.openBuilder')}
          </Button>
        </div>
      </header>

      <section style={layoutStyle}>
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--canon-cream)',
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t('page.activeList')}
          </h2>
          {list.isLoading ? (
            <p style={{ color: 'var(--canon-cream-3)' }}>{t('page.loading')}</p>
          ) : journeys.length === 0 ? (
            <Card style={{ padding: 18 }}>
              <p style={{ color: 'var(--canon-cream-2)', fontSize: 13 }}>{t('page.empty')}</p>
            </Card>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {journeys.map((j) => (
                <li key={j.id}>
                  <Card style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <p
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--canon-cream)',
                            margin: 0,
                          }}
                        >
                          {j.name}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 11,
                            color: 'var(--canon-cream-2)',
                            margin: '2px 0 0',
                          }}
                        >
                          {t(`triggerEvent.${j.trigger_event}`)} ·{' '}
                          {t('page.stepsCount', {
                            count: Array.isArray(j.steps) ? j.steps.length : 0,
                          })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span
                          style={{
                            padding: '2px 10px',
                            borderRadius: 'var(--canon-radius-pill)',
                            fontSize: 11,
                            fontFamily: 'var(--font-body)',
                            background: j.active ? 'rgba(34,197,94,0.10)' : 'rgba(245,158,11,0.10)',
                            color: j.active ? '#86efac' : '#fcd34d',
                          }}
                        >
                          {j.active ? t('page.active') : t('page.paused')}
                        </span>
                        {j.active ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await pause.mutateAsync({ journeyId: j.id });
                              invalidate.invalidateJourneys();
                            }}
                          >
                            {t('page.pause')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--canon-cream)',
              margin: '0 0 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t('page.templatesTitle')}
          </h2>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {JOURNEY_TEMPLATES.map((tmpl) => (
              <li key={tmpl.slug}>
                <Card style={{ padding: 12 }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--canon-cream)',
                      margin: 0,
                    }}
                  >
                    {t(`templates.${tmpl.slug}.name`)}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      color: 'var(--canon-cream-2)',
                      margin: '4px 0 8px',
                    }}
                  >
                    {t(`templates.${tmpl.slug}.description`)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCreateFromTemplate(tmpl.slug)}
                    disabled={create.isPending}
                  >
                    {t('page.useTemplate')}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {showBuilder ? (
        <BuilderPanel
          name={draftName}
          onNameChange={setDraftName}
          trigger={draftTrigger}
          onTriggerChange={setDraftTrigger}
          steps={draftSteps}
          onStepsChange={setDraftSteps}
          onSave={handleSaveDraft}
          isSaving={create.isPending}
          error={createError}
        />
      ) : null}
    </main>
  );
}

function BuilderPanel({
  name,
  onNameChange,
  trigger,
  onTriggerChange,
  steps,
  onStepsChange,
  onSave,
  isSaving,
  error,
}: {
  name: string;
  onNameChange: (v: string) => void;
  trigger: JourneyTriggerEvent;
  onTriggerChange: (v: JourneyTriggerEvent) => void;
  steps: JourneyStep[];
  onStepsChange: (v: JourneyStep[]) => void;
  onSave: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  const t = useTranslations('dev.crm.journey.builder');
  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--canon-radius-input)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg)',
    color: 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
  };

  const addStep = (type: 'send_email' | 'send_wa' | 'wait' | 'conditional') => {
    let newStep: JourneyStep;
    if (type === 'wait') newStep = { type: 'wait', waitHours: 24 };
    else if (type === 'send_email')
      newStep = { type: 'send_email', templateId: 'email_default_v1' };
    else if (type === 'send_wa') newStep = { type: 'send_wa', waTemplateId: 'wa_default_v1' };
    else
      newStep = {
        type: 'conditional',
        condition: { field: 'lead_score', op: 'gte', value: 70 },
        thenStep: 0,
        elseStep: 1,
      };
    onStepsChange([...steps, newStep]);
  };

  const removeStep = (idx: number) => {
    onStepsChange(steps.filter((_, i) => i !== idx));
  };

  const moveStep = (idx: number, dir: 1 | -1) => {
    const next = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    [next[idx], next[target]] = [next[target] as JourneyStep, next[idx] as JourneyStep];
    onStepsChange(next);
  };

  return (
    <section
      aria-label={t('aria')}
      style={{
        marginTop: 24,
        padding: 18,
        borderRadius: 'var(--canon-radius-card)',
        background: 'var(--canon-bg-2)',
        border: '1px solid var(--canon-border-2)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--canon-cream)',
          margin: '0 0 12px',
        }}
      >
        {t('title')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label
            htmlFor="journey-name"
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--canon-cream-2)',
              marginBottom: 4,
            }}
          >
            {t('nameLabel')}
          </label>
          <input
            id="journey-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            htmlFor="journey-trigger"
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--canon-cream-2)',
              marginBottom: 4,
            }}
          >
            {t('triggerLabel')}
          </label>
          <select
            id="journey-trigger"
            value={trigger}
            onChange={(e) => onTriggerChange(e.target.value as JourneyTriggerEvent)}
            style={inputStyle}
          >
            {JOURNEY_TRIGGER_EVENTS.map((tr) => (
              <option key={tr} value={tr}>
                {t(`trigger.${tr}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {steps.map((s, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: ordered builder list, idx is the canonical position
          <li key={`${s.type}-${idx}`}>
            <JourneyStepRow
              step={s}
              index={idx}
              canMoveUp={idx > 0}
              canMoveDown={idx < steps.length - 1}
              onMoveUp={() => moveStep(idx, -1)}
              onMoveDown={() => moveStep(idx, 1)}
              onRemove={() => removeStep(idx)}
            />
          </li>
        ))}
        {steps.length === 0 ? (
          <li
            style={{
              color: 'var(--canon-cream-3)',
              fontSize: 12,
              textAlign: 'center',
              padding: 12,
            }}
          >
            {t('noSteps')}
          </li>
        ) : null}
      </ul>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {JOURNEY_STEP_TYPES.map((type) => (
          <Button key={type} type="button" variant="ghost" size="sm" onClick={() => addStep(type)}>
            + {t(`addStep.${type}`)}
          </Button>
        ))}
      </div>

      {error ? <p style={{ marginTop: 12, fontSize: 11, color: '#fca5a5' }}>{error}</p> : null}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={isSaving || name.trim().length === 0 || steps.length === 0}
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </section>
  );
}
