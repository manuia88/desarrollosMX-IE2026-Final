'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { BacktestChart } from '@/features/indices-publicos/components/BacktestChart';
import { IndexBadge } from '@/features/indices-publicos/components/IndexBadge';
import {
  type BacktestHashInput,
  encodeBacktestHash,
} from '@/features/indices-publicos/lib/backtest-hash';
import {
  computeBacktestReturns,
  type RawSeriesPoint,
} from '@/features/indices-publicos/lib/backtest-simulator';
import {
  COUNTRY_CODES,
  type CountryCode,
} from '@/features/indices-publicos/lib/index-registry-helpers';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { trpc } from '@/shared/lib/trpc/client';
import { INDEX_CODES, type IndexCode, SCOPE_TYPES, type ScopeType } from '@/shared/types/scores';

const MAX_SCOPES = 4;

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface SubmittedInput {
  readonly indexCode: IndexCode;
  readonly scopeType: ScopeType;
  readonly countryCode: CountryCode;
  readonly from: string;
  readonly to: string;
  readonly scopeIds: readonly string[];
}

interface BacktestConsoleProps {
  readonly initial?: BacktestHashInput | null;
}

export function BacktestConsole({ initial = null }: BacktestConsoleProps) {
  const t = useTranslations('IndicesPublic');
  const locale = useLocale();
  const [indexCode, setIndexCode] = useState<IndexCode>(initial?.indexCode ?? 'IPV');
  const [scopeType, setScopeType] = useState<ScopeType>(initial?.scopeType ?? 'colonia');
  const [countryCode, setCountryCode] = useState<CountryCode>(initial?.countryCode ?? 'MX');
  const [from, setFrom] = useState(initial?.from ?? '2024-01-01');
  const [to, setTo] = useState(initial?.to ?? '2026-01-01');
  const [scopeIds, setScopeIds] = useState<string[]>(
    initial && initial.scopeIds.length > 0 ? [...initial.scopeIds] : [''],
  );
  const [submittedInput, setSubmittedInput] = useState<SubmittedInput | null>(
    initial && initial.scopeIds.length > 0
      ? {
          indexCode: initial.indexCode,
          scopeType: initial.scopeType,
          countryCode: initial.countryCode,
          from: initial.from,
          to: initial.to,
          scopeIds: [...initial.scopeIds],
        }
      : null,
  );
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState(false);

  // Hidrata desde hash únicamente en el primer render cliente si el server
  // prop no llegó (edge case de client-side navigation hacia la ruta).
  useEffect(() => {
    if (initial !== null || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hash = params.get('h');
    if (!hash) return;
    // Import dinámico evita acoplar el bundle del servidor al del cliente
    // cuando no hay hash presente.
    import('@/features/indices-publicos/lib/backtest-hash').then((mod) => {
      const decoded = mod.decodeBacktestHash(hash);
      if (!decoded || decoded.scopeIds.length === 0) return;
      setIndexCode(decoded.indexCode);
      setScopeType(decoded.scopeType);
      setCountryCode(decoded.countryCode);
      setFrom(decoded.from);
      setTo(decoded.to);
      setScopeIds([...decoded.scopeIds]);
      setSubmittedInput({
        indexCode: decoded.indexCode,
        scopeType: decoded.scopeType,
        countryCode: decoded.countryCode,
        from: decoded.from,
        to: decoded.to,
        scopeIds: [...decoded.scopeIds],
      });
    });
  }, [initial]);

  const canSubmit = useMemo(() => {
    if (!ISO_REGEX.test(from) || !ISO_REGEX.test(to)) return false;
    if (from >= to) return false;
    const clean = scopeIds.map((s) => s.trim()).filter((s) => s.length > 0);
    return clean.length >= 1 && clean.length <= MAX_SCOPES;
  }, [from, to, scopeIds]);

  const backtestQuery = trpc.indicesPublic.getBacktest.useQuery(
    submittedInput
      ? {
          indexCode: submittedInput.indexCode,
          scopeType: submittedInput.scopeType,
          countryCode: submittedInput.countryCode,
          from: submittedInput.from,
          to: submittedInput.to,
          scopeIds: [...submittedInput.scopeIds],
        }
      : {
          indexCode: 'IPV',
          scopeType: 'colonia',
          countryCode: 'MX',
          from: '2024-01-01',
          to: '2026-01-01',
          scopeIds: ['__placeholder__'],
        },
    { enabled: submittedInput !== null },
  );

  const results = useMemo(() => {
    const data = backtestQuery.data;
    if (!Array.isArray(data)) return [];
    const series: RawSeriesPoint[] = data.map((point) => ({
      scope_id: point.scope_id,
      period_date: point.period_date,
      value: point.value,
    }));
    return computeBacktestReturns(series);
  }, [backtestQuery.data]);

  const handleAddScope = () => {
    setScopeIds((prev) => (prev.length >= MAX_SCOPES ? prev : [...prev, '']));
  };

  const handleRemoveScope = (index: number) => {
    setScopeIds((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleChangeScope = (index: number, value: string) => {
    setScopeIds((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleRun = () => {
    const clean = scopeIds.map((s) => s.trim()).filter((s) => s.length > 0);
    if (clean.length === 0) return;
    setSubmittedInput({
      indexCode,
      scopeType,
      countryCode,
      from,
      to,
      scopeIds: clean.slice(0, MAX_SCOPES),
    });
  };

  const handleShare = async () => {
    const clean = scopeIds.map((s) => s.trim()).filter((s) => s.length > 0);
    if (clean.length === 0) {
      setShareError(true);
      setTimeout(() => setShareError(false), 2000);
      return;
    }
    try {
      const hash = encodeBacktestHash({
        indexCode,
        scopeType,
        countryCode,
        from,
        to,
        scopeIds: clean.slice(0, MAX_SCOPES),
      });
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/${locale}/indices/backtest?h=${hash}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareError(true);
      setTimeout(() => setShareError(false), 2000);
    }
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--color-surface-sunken)',
    borderColor: 'var(--color-border-subtle)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
  };

  return (
    <section className="flex flex-col gap-6">
      <aside
        role="note"
        className="rounded-[var(--radius-md)] border px-4 py-3 text-xs"
        style={{
          borderColor: 'var(--color-border-subtle)',
          background: 'var(--color-bg-muted)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {t('backtest.disclaimer')}
      </aside>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleRun();
        }}
        className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('pro.filter_index')}</span>
          <select
            value={indexCode}
            onChange={(event) => setIndexCode(event.target.value as IndexCode)}
            className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
            style={selectStyle}
          >
            {INDEX_CODES.map((code) => (
              <option key={code} value={code}>
                {code} — {t(`indices.${code}.short`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('pro.filter_scope')}</span>
          <select
            value={scopeType}
            onChange={(event) => setScopeType(event.target.value as ScopeType)}
            className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
            style={selectStyle}
          >
            {SCOPE_TYPES.map((scope) => (
              <option key={scope} value={scope}>
                {t(`scope.${scope}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('pro.filter_country')}</span>
          <select
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value as CountryCode)}
            className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
            style={selectStyle}
          >
            {COUNTRY_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('backtest.from_label')}</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
            style={selectStyle}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('backtest.to_label')}</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
            style={selectStyle}
          />
        </label>

        <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('backtest.compare_heading')}
          </span>
          <div className="flex flex-wrap gap-2">
            {scopeIds.map((value, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: entries sin id estable y re-render controlado
                key={`scope-${index}`}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={value}
                  onChange={(event) => handleChangeScope(index, event.target.value)}
                  placeholder="scope_id"
                  className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm"
                  style={selectStyle}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveScope(index)}
                  disabled={scopeIds.length <= 1}
                  aria-label={t('backtest.remove_scope')}
                  className="rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs disabled:opacity-50"
                  style={selectStyle}
                >
                  −
                </button>
              </div>
            ))}
            {scopeIds.length < MAX_SCOPES ? (
              <button
                type="button"
                onClick={handleAddScope}
                className="rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs"
                style={selectStyle}
              >
                {t('backtest.add_scope')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={!canSubmit || backtestQuery.isLoading}
            className="rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{
              background: 'var(--gradient-p)',
              color: 'var(--color-text-inverse)',
            }}
          >
            {t('backtest.run')}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!canSubmit}
            aria-label={t('backtest.share.button_aria')}
            data-testid="backtest-share-button"
            className="rounded-[var(--radius-sm)] border px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={selectStyle}
          >
            {t('backtest.share.button')}
          </button>
          <output
            aria-live="polite"
            className="text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {shareCopied ? t('backtest.share.copied') : null}
            {shareError ? t('backtest.share.error') : null}
          </output>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IndexBadge code={indexCode} size="md" showName />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {from} → {to}
          </span>
        </div>
        <BacktestChart results={results} ariaLabel={t('backtest.title')} />
        <table
          className="min-w-full text-xs"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-primary)',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              <th
                className="border-b px-3 py-2 text-left text-[11px] uppercase tracking-wider"
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('ranking.col_scope')}
              </th>
              <th
                className="border-b px-3 py-2 text-right text-[11px] uppercase tracking-wider"
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('backtest.return_label')}
              </th>
              <th
                className="border-b px-3 py-2 text-right text-[11px] uppercase tracking-wider"
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('backtest.volatility_label')}
              </th>
              <th
                className="border-b px-3 py-2 text-right text-[11px] uppercase tracking-wider"
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Max DD
              </th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  —
                </td>
              </tr>
            ) : (
              results.map((scope) => (
                <tr
                  key={scope.scope_id}
                  className="border-b"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  <td className="px-3 py-1.5">
                    {resolveZoneLabelSync({
                      scopeType: submittedInput?.scopeType ?? scopeType,
                      scopeId: scope.scope_id,
                    })}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {scope.total_return_pct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {scope.volatility_pct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {scope.max_drawdown_pct.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
