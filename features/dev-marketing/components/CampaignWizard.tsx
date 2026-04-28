'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  CAMPAIGN_TIPOS,
  CHANNELS,
  type Channel,
  CREATIVE_VARIANTS,
} from '@/features/dev-marketing/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { cn } from '@/shared/ui/primitives/cn';

interface Props {
  readonly onClose: () => void;
  readonly onCreated: () => void;
}

interface ProjectRow {
  readonly id: string;
  readonly nombre: string;
  readonly ciudad: string | null;
  readonly colonia: string | null;
}

interface CreativeForm {
  readonly variant: (typeof CREATIVE_VARIANTS)[number];
  readonly url: string;
  readonly aiGenerated: boolean;
}

const STEPS = ['type', 'projects', 'budget', 'creatives', 'utm'] as const;
type Step = (typeof STEPS)[number];

export function CampaignWizard({ onClose, onCreated }: Props) {
  const t = useTranslations('dev.marketing.campaigns.wizard');
  const tTypes = useTranslations('dev.marketing.campaigns.types');
  const [step, setStep] = useState<Step>('type');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<(typeof CAMPAIGN_TIPOS)[number]>('launch');
  const [proyectoIds, setProyectoIds] = useState<readonly string[]>([]);
  const [presupuestoMxn, setPresupuestoMxn] = useState(50000);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(addDays(today(), 30));
  const [canales, setCanales] = useState<readonly Channel[]>(['meta_ads', 'landing']);
  const [creatives, setCreatives] = useState<readonly CreativeForm[]>([
    { variant: 'postCuadrado', url: '', aiGenerated: false },
  ]);
  const [utmSource, setUtmSource] = useState('meta');
  const [utmMedium, setUtmMedium] = useState('cpc');
  const [utmCampaign, setUtmCampaign] = useState('launch_q3');
  const [error, setError] = useState<string | null>(null);

  const projectsQ = trpc.analyticsDev.listProjects.useQuery(undefined, { retry: false });
  const projects = (projectsQ.data ?? []) as ProjectRow[];

  const create = trpc.devMarketing.createCampaign.useMutation({
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (e) => setError(e.message),
  });

  const stepIndex = STEPS.indexOf(step);
  const next = () => {
    if (step === 'type' && nombre.trim().length < 2) {
      setError(t('errors.nameRequired'));
      return;
    }
    if (step === 'projects' && proyectoIds.length === 0) {
      setError(t('errors.projectsRequired'));
      return;
    }
    if (step === 'budget') {
      if (presupuestoMxn <= 0) {
        setError(t('errors.budgetPositive'));
        return;
      }
      if (canales.length === 0) {
        setError(t('errors.channelRequired'));
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError(t('errors.dateRange'));
        return;
      }
    }
    if (step === 'creatives' && (creatives.length === 0 || creatives.some((c) => !c.url))) {
      setError(t('errors.creativesRequired'));
      return;
    }
    setError(null);
    if (stepIndex < STEPS.length - 1) {
      const nextStep = STEPS[stepIndex + 1];
      if (nextStep) setStep(nextStep);
    }
  };
  const back = () => {
    setError(null);
    if (stepIndex > 0) {
      const prev = STEPS[stepIndex - 1];
      if (prev) setStep(prev);
    }
  };

  const submit = () => {
    setError(null);
    create.mutate({
      nombre,
      tipo,
      proyectoIds: [...proyectoIds],
      presupuestoMxn,
      startDate,
      endDate,
      canales: [...canales],
      creatives: creatives.map((c) => ({
        variant: c.variant,
        url: c.url,
        aiGenerated: c.aiGenerated,
      })),
      utmSource,
      utmMedium,
      utmCampaign,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('ariaLabel')}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    >
      <Card className="w-full max-w-2xl space-y-4 p-6">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{t(`step${stepIndex + 1}Title`)}</h3>
          <span className="text-xs text-[color:var(--color-text-secondary)]">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </header>

        {step === 'type' ? (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[color:var(--color-text-secondary)]">
                {t('nameLabel')}
              </span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm"
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm text-[color:var(--color-text-secondary)]">
                {t('typeLabel')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_TIPOS.map((tipoId) => (
                  <button
                    key={tipoId}
                    type="button"
                    onClick={() => setTipo(tipoId)}
                    aria-pressed={tipo === tipoId}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs',
                      tipo === tipoId
                        ? 'border-[color:var(--color-accent-mint)] bg-[color:var(--color-accent-mint)] text-[color:var(--color-text-on-accent)]'
                        : 'border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)]',
                    )}
                  >
                    {tTypes(tipoId)}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {step === 'projects' ? (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {projectsQ.isLoading ? (
              <p className="text-sm text-[color:var(--color-text-secondary)]">
                {t('loadingProjects')}
              </p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-[color:var(--color-text-secondary)]">
                {t('emptyProjects')}
              </p>
            ) : (
              projects.map((p) => {
                const checked = proyectoIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-[color:var(--color-border-subtle)] px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setProyectoIds((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                        );
                      }}
                    />
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-xs text-[color:var(--color-text-secondary)]">
                      {p.ciudad ?? '—'} {p.colonia ? `· ${p.colonia}` : ''}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        ) : null}

        {step === 'budget' ? (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[color:var(--color-text-secondary)]">
                {t('budgetLabel')}
              </span>
              <input
                type="number"
                min={0}
                value={presupuestoMxn}
                onChange={(e) => setPresupuestoMxn(Number(e.target.value))}
                className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="mb-1 block text-[color:var(--color-text-secondary)]">
                  {t('startLabel')}
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[color:var(--color-text-secondary)]">
                  {t('endLabel')}
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm"
                />
              </label>
            </div>
            <fieldset className="space-y-1">
              <legend className="text-sm text-[color:var(--color-text-secondary)]">
                {t('channelsLabel')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => {
                  const checked = canales.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        setCanales((prev) =>
                          checked ? prev.filter((c) => c !== ch) : [...prev, ch],
                        );
                      }}
                      aria-pressed={checked}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs',
                        checked
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-[color:var(--color-border-subtle)] text-[color:var(--color-text-secondary)]',
                      )}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        ) : null}

        {step === 'creatives' ? (
          <div className="space-y-2">
            {creatives.map((c, idx) => (
              <div
                key={`creative-${String(idx)}`}
                className="flex flex-col gap-2 rounded-md border border-[color:var(--color-border-subtle)] p-3 sm:flex-row"
              >
                <select
                  value={c.variant}
                  onChange={(e) => {
                    const v = e.target.value as (typeof CREATIVE_VARIANTS)[number];
                    setCreatives((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, variant: v } : p)),
                    );
                  }}
                  className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-xs"
                  aria-label={t('variantLabel')}
                >
                  {CREATIVE_VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  placeholder={t('urlPlaceholder')}
                  value={c.url}
                  onChange={(e) => {
                    const url = e.target.value;
                    setCreatives((prev) => prev.map((p, i) => (i === idx ? { ...p, url } : p)));
                  }}
                  className="flex-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-xs"
                />
                <label className="flex items-center gap-1 text-xs text-[color:var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={c.aiGenerated}
                    onChange={(e) => {
                      const aiGenerated = e.target.checked;
                      setCreatives((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, aiGenerated } : p)),
                      );
                    }}
                  />
                  AI
                </label>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCreatives((prev) => [
                  ...prev,
                  { variant: 'postCuadrado', url: '', aiGenerated: false },
                ])
              }
            >
              {t('addCreativeCta')}
            </Button>
            <p className="rounded-md border border-violet-200 bg-violet-50 p-2 text-[11px] text-violet-900">
              {t('aiStubNote')}
            </p>
          </div>
        ) : null}

        {step === 'utm' ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[color:var(--color-text-secondary)]">
                utm_source
              </span>
              <input
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[color:var(--color-text-secondary)]">
                utm_medium
              </span>
              <input
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[color:var(--color-text-secondary)]">
                utm_campaign
              </span>
              <input
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                className="w-full rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] px-3 py-1.5 text-sm"
              />
            </label>
          </div>
        ) : null}

        {error ? <p className="text-xs text-rose-700">{error}</p> : null}

        <footer className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('cancelCta')}
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 ? (
              <Button variant="ghost-solid" size="sm" onClick={back}>
                {t('backCta')}
              </Button>
            ) : null}
            {stepIndex < STEPS.length - 1 ? (
              <Button variant="primary" size="sm" onClick={next}>
                {t('nextCta')}
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={submit} disabled={create.isPending}>
                {create.isPending ? t('submittingCta') : t('submitCta')}
              </Button>
            )}
          </div>
        </footer>
      </Card>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
