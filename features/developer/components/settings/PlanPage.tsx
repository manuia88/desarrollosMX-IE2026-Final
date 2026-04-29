'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { DEV_PLAN_CODES, type DevPlanCode } from '@/features/developer/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

const FEATURE_ROWS: ReadonlyArray<{ key: string; labelKey: string }> = [
  { key: 'projects_max', labelKey: 'features.projectsMax' },
  { key: 'ai_extractions_month', labelKey: 'features.aiExtractions' },
  { key: 'storage_gb', labelKey: 'features.storage' },
  { key: 'drive_monitors_max', labelKey: 'features.driveMonitors' },
  { key: 'pricing_autopilot', labelKey: 'features.pricingAutopilot' },
  { key: 'competitive_intel', labelKey: 'features.competitiveIntel' },
  { key: 'absorption_forecast', labelKey: 'features.absorptionForecast' },
  { key: 'predictions_tab', labelKey: 'features.predictionsTab' },
  { key: 'studio_bundled', labelKey: 'features.studioBundled' },
  { key: 'api_access', labelKey: 'features.apiAccess' },
  { key: 'bi_export', labelKey: 'features.biExport' },
];

function formatValue(raw: unknown, t: (key: string) => string): string {
  if (raw === true) return t('cellTrue');
  if (raw === false) return t('cellFalse');
  if (raw === -1) return t('cellUnlimited');
  if (raw === undefined || raw === null) return '—';
  if (typeof raw === 'number') return new Intl.NumberFormat('es-MX').format(raw);
  return String(raw);
}

export function PlanPage() {
  const t = useTranslations('dev.plans');
  const plansQuery = trpc.developer.listDevPlans.useQuery();
  const currentQuery = trpc.developer.currentDevPlan.useQuery();
  const switchMutation = trpc.developer.switchDevPlan.useMutation();

  const plans = plansQuery.data ?? [];
  const currentCode = currentQuery.data?.planCode ?? 'dev_free';
  const currentIsPlaceholder = currentQuery.data?.isPlaceholder ?? true;

  const onUpgrade = useCallback(
    (code: DevPlanCode) => {
      switchMutation.mutate({ planCode: code });
    },
    [switchMutation],
  );

  const limitWarning = useMemo(() => {
    const plan = plans.find((p) => p.code === currentCode);
    if (!plan) return null;
    const fs = plan.featuresSummary;
    const max = fs.projects_max;
    if (typeof max !== 'number' || max < 0) return null;
    const used = Math.round(max * 0.8);
    if (used >= max - 1 && max > 0) return t('limitWarning', { plan: plan.name });
    return null;
  }, [currentCode, plans, t]);

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--canon-cream-2)' }}>
          {t('subtitle')}
        </p>
      </header>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              {t('currentPlanLabel')}
            </div>
            <div className="mt-1 text-xl font-bold" style={{ color: 'var(--canon-cream)' }}>
              {t(`tiers.${currentCode}` as 'tiers.dev_free')}
            </div>
            {currentIsPlaceholder && (
              <span
                className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}
              >
                {t('placeholderBadge')}
              </span>
            )}
          </div>
          {limitWarning && (
            <div
              className="rounded-2xl px-4 py-2 text-sm"
              style={{
                background: 'rgba(245,158,11,0.10)',
                border: '1px solid rgba(245,158,11,0.32)',
                color: '#fcd34d',
              }}
            >
              {limitWarning}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
          {t('matrixTitle')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr style={{ color: 'var(--canon-cream-3)' }}>
                <th className="py-2 pr-3 text-left text-[11px] uppercase tracking-[0.16em]">
                  {t('featureLabel')}
                </th>
                {DEV_PLAN_CODES.map((code) => {
                  const plan = plans.find((p) => p.code === code);
                  return (
                    <th key={code} className="py-2 px-3 text-left">
                      <div
                        className="text-sm font-bold"
                        style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
                      >
                        {t(`tiers.${code}` as 'tiers.dev_free')}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
                        {plan ? t(`pricing.${code}` as 'pricing.dev_free') : t('pricingLoading')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr
                  key={row.key}
                  className="border-t"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <td className="py-2 pr-3 text-[12px]" style={{ color: 'var(--canon-cream-2)' }}>
                    {t(row.labelKey as 'features.projectsMax')}
                  </td>
                  {DEV_PLAN_CODES.map((code) => {
                    const plan = plans.find((p) => p.code === code);
                    const value = plan?.featuresSummary?.[row.key as 'api_access'];
                    return (
                      <td
                        key={code}
                        className="py-2 px-3 text-[12px] tabular-nums"
                        style={{ color: 'var(--canon-cream)' }}
                      >
                        {formatValue(value, t)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <td />
                {DEV_PLAN_CODES.map((code) => (
                  <td key={code} className="py-3 px-3">
                    <Button
                      type="button"
                      variant={code === currentCode ? 'glass' : 'primary'}
                      size="sm"
                      disabled={code === currentCode || switchMutation.isPending}
                      onClick={() => onUpgrade(code)}
                    >
                      {code === currentCode
                        ? t('currentBadge')
                        : t('upgradeCta', { plan: t(`tiers.${code}` as 'tiers.dev_free') })}
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
          {t('bundleStudio')}
        </p>
      </Card>

      <Card className="p-6 text-sm" style={{ color: 'var(--canon-cream-2)' }}>
        <span
          className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
          style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}
          title={t('disclosureTitle')}
        >
          {t('disclosureBadge')}
        </span>
      </Card>
    </div>
  );
}
