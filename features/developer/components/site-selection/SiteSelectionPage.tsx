'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { FeatureGate } from '@/features/developer/components/FeatureGate';
import { trpc } from '@/shared/lib/trpc/client';
import { Breadcrumbs } from '@/shared/ui/layout/breadcrumbs';
import { Card } from '@/shared/ui/primitives/canon';

type ResultZone = {
  zoneId: string | null;
  colonia: string;
  ciudad: string;
  fitScore: number;
  rationale: string;
  lat: number | null;
  lng: number | null;
};

type SiteSelectionResult = {
  queryId: string;
  zones: readonly ResultZone[];
  narrative: string;
  costUsd: number;
  durationMs: number;
  isPlaceholder: boolean;
};

type HistoryRow = {
  id: string;
  query_text: string;
  ai_narrative: string | null;
  cost_usd: number | null;
  duration_ms: number | null;
  created_at: string;
};

export function SiteSelectionPage() {
  const t = useTranslations('dev.siteSelection');
  const tBc = useTranslations('dev.layout.breadcrumbs');
  const [query, setQuery] = useState('');
  const [latestResult, setLatestResult] = useState<SiteSelectionResult | null>(null);

  const historyQuery = trpc.developer.siteSelectionHistory.useQuery(
    { limit: 10 },
    { staleTime: 30_000, retry: false },
  );
  const utils = trpc.useUtils();

  const mutation = trpc.developer.siteSelectionAI.useMutation({
    onSuccess: (data) => {
      setLatestResult(data as SiteSelectionResult);
      void utils.developer.siteSelectionHistory.invalidate();
    },
  });

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length < 10) return;
      mutation.mutate({ query: trimmed });
    },
    [query, mutation],
  );

  const onExportPdf = useCallback(() => {
    // STUB ADR-018 — pdfkit no shipped yet.
    // L-NEW-SITE-SELECTION-PDF-EXPORT — agendar pdf-lib + cron persistir pdf_url
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dmx:site-selection-pdf-intent', {
          detail: { queryId: latestResult?.queryId ?? null },
        }),
      );
    }
  }, [latestResult]);

  return (
    <FeatureGate feature="dev.api_access" plan="pro">
      <div className="space-y-6">
        <Breadcrumbs
          tint="lavender"
          items={[{ label: tBc('home') }, { label: tBc('siteSelection') }]}
        />

        <header className="flex flex-col gap-2">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
          >
            {t('title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--canon-cream-2)' }}>
            {t('subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card className="flex flex-col gap-3 p-6">
              <form onSubmit={onSubmit} className="flex flex-col gap-3">
                <label
                  htmlFor="ssai-query"
                  className="text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: 'var(--canon-cream-3)' }}
                >
                  {t('queryLabel')}
                </label>
                <textarea
                  id="ssai-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  placeholder={t('queryPlaceholder')}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--canon-cream)',
                  }}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
                    {t('costNote')}
                  </span>
                  <button
                    type="submit"
                    disabled={query.trim().length < 10 || mutation.isPending}
                    className="rounded-full px-5 py-2 text-sm font-semibold text-white"
                    style={{
                      background: 'linear-gradient(90deg, #6366F1, #EC4899)',
                      opacity: query.trim().length < 10 || mutation.isPending ? 0.5 : 1,
                      cursor:
                        query.trim().length < 10 || mutation.isPending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {mutation.isPending ? t('loading') : t('ctaQuery')}
                  </button>
                </div>
              </form>
            </Card>

            {latestResult ? (
              <Card className="flex flex-col gap-4 p-6">
                <header className="flex items-center justify-between">
                  <h2
                    className="text-base font-semibold"
                    style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
                  >
                    {t('resultsTitle')}
                  </h2>
                  <div className="flex items-center gap-2">
                    {latestResult.isPlaceholder ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                        style={{
                          background: 'rgba(99,102,241,0.18)',
                          color: '#a5b4fc',
                        }}
                        title={t('disclosureTitle')}
                      >
                        {t('disclosureBadge')}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={onExportPdf}
                      className="rounded-full px-3 py-1.5 text-xs font-medium"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--canon-cream)',
                      }}
                    >
                      {t('exportPdf')}
                    </button>
                  </div>
                </header>

                <p className="text-sm leading-relaxed" style={{ color: 'var(--canon-cream-2)' }}>
                  {latestResult.narrative}
                </p>

                <ul className="flex flex-col gap-2">
                  {latestResult.zones.map((z) => (
                    <li
                      key={`${z.colonia}-${z.ciudad}-${z.fitScore}`}
                      className="flex items-start justify-between gap-3 rounded-xl px-3 py-3"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: 'var(--canon-cream)' }}
                        >
                          {z.colonia}, {z.ciudad}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--canon-cream-2)' }}>
                          {z.rationale}
                        </span>
                      </div>
                      <span
                        role="img"
                        className="shrink-0 rounded-full px-3 py-1 text-sm font-bold text-white"
                        style={{
                          background:
                            z.fitScore >= 80
                              ? 'linear-gradient(135deg, #10b981, #34d399)'
                              : z.fitScore >= 60
                                ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                                : 'linear-gradient(135deg, #ef4444, #f87171)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                        aria-label={t('fitScoreAria', { score: z.fitScore })}
                      >
                        {z.fitScore}
                      </span>
                    </li>
                  ))}
                </ul>

                <footer
                  className="flex items-center justify-between text-[11px]"
                  style={{ color: 'var(--canon-cream-3)' }}
                >
                  <span>
                    {t('costUsd')}: ${latestResult.costUsd.toFixed(4)}
                  </span>
                  <span>{t('durationMs', { ms: latestResult.durationMs })}</span>
                </footer>
              </Card>
            ) : null}

            {mutation.error ? (
              <Card className="p-4">
                <p className="text-sm" style={{ color: '#f87171' }}>
                  {mutation.error.message}
                </p>
              </Card>
            ) : null}
          </div>

          <aside>
            <Card className="flex flex-col gap-3 p-6">
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
              >
                {t('history')}
              </h3>
              {historyQuery.isLoading ? (
                <p className="text-xs" style={{ color: 'var(--canon-cream-2)' }} aria-busy="true">
                  {t('loading')}
                </p>
              ) : (historyQuery.data as HistoryRow[] | undefined)?.length ? (
                <ul className="flex flex-col gap-2">
                  {((historyQuery.data as HistoryRow[]) ?? []).map((h) => (
                    <li
                      key={h.id}
                      className="rounded-xl px-3 py-2 text-xs"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        color: 'var(--canon-cream-2)',
                      }}
                    >
                      <span className="line-clamp-2">{h.query_text}</span>
                      <span
                        className="mt-1 block text-[10px]"
                        style={{ color: 'var(--canon-cream-3)' }}
                      >
                        {new Date(h.created_at).toLocaleDateString('es-MX')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs" style={{ color: 'var(--canon-cream-2)' }}>
                  {t('historyEmpty')}
                </p>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </FeatureGate>
  );
}
