'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { useTranslations } from 'next-intl';
import type { InventarioUnidadRow } from '@/features/developer/schemas';

const DEMAND_BORDER: Record<'red' | 'amber' | 'green', string> = {
  red: 'border-rose-500/70 shadow-[0_0_0_1px_rgba(244,63,94,0.25)]',
  amber: 'border-amber-400/70 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]',
  green: 'border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]',
};

const STATUS_BG: Record<string, string> = {
  disponible: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30',
  apartada: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30',
  reservada: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30',
  vendida: 'bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30',
  bloqueada: 'bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/30',
};

interface UnitCardProps {
  unit: InventarioUnidadRow;
  demandSignals: Record<string, unknown> | null;
  onOpen: (unitId: string) => void;
  locale: string;
}

export function UnitCard({ unit, demandSignals, onOpen, locale }: UnitCardProps) {
  const t = useTranslations('dev.inventario');
  const color = (unit.demand_color ?? 'red') as 'red' | 'amber' | 'green';
  const photoUrl = unit.photos?.[0] ?? null;
  const days = computeDaysOnMarket(unit.created_at);
  const hasPartial = !demandSignals || Object.keys(demandSignals).length === 0;
  const priceFmt =
    unit.price_mxn != null
      ? new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'MXN',
          maximumFractionDigits: 0,
        }).format(unit.price_mxn)
      : '—';

  return (
    <button
      type="button"
      onClick={() => onOpen(unit.id)}
      aria-label={t('card.ariaLabel', {
        numero: unit.numero,
        status: t(`status.${unit.status}`),
        demand: t(`card.demandColorLabel.${color}`),
      })}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border-2 ${DEMAND_BORDER[color]} bg-white/[0.04] text-left transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/[0.06]">
        {photoUrl ? (
          // biome-ignore lint/performance/noImgElement: user-uploaded photo with unknown dimensions; CDN handles optimization
          <img
            src={photoUrl}
            alt={`Unidad ${unit.numero}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wider text-white/40">
            {t('card.noPhoto')}
          </div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_BG[unit.status] ?? STATUS_BG.bloqueada}`}
        >
          {t(`status.${unit.status}`)}
        </span>
        <Tooltip.Provider delayDuration={150}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span
                className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
                  color === 'green'
                    ? 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/40'
                    : color === 'amber'
                      ? 'bg-amber-500/20 text-amber-100 ring-amber-400/40'
                      : 'bg-rose-500/20 text-rose-100 ring-rose-400/40'
                }`}
              >
                {unit.demand_score_30d}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={6}
                className="z-50 max-w-xs rounded-lg bg-zinc-900/95 p-3 text-xs text-white shadow-xl ring-1 ring-white/10"
              >
                <div className="mb-1 font-semibold">{t('card.demandTooltipTitle')}</div>
                <div className="mb-2 text-white/70">
                  {t(`card.demandColorLabel.${color}`)} · {unit.demand_score_30d}/100
                </div>
                {demandSignals ? (
                  <ul className="space-y-0.5 text-white/80">
                    {Object.entries(demandSignals).map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-3">
                        <span>{translateSignal(k, t)}</span>
                        <span className="font-mono">{formatSignalValue(v)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {hasPartial ? (
                  <div className="mt-2 border-t border-white/10 pt-2 text-[10px] text-amber-200">
                    {t('card.partialSignalsTooltip')}
                  </div>
                ) : null}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between">
          <span className="font-display text-base font-semibold text-white">{unit.numero}</span>
          <span className="text-xs text-white/60">{t(`tipo.${unit.tipo}`)}</span>
        </div>
        {unit.proyecto_nombre ? (
          <span className="line-clamp-1 text-[11px] uppercase tracking-wider text-white/50">
            {unit.proyecto_nombre}
          </span>
        ) : null}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-display text-lg font-bold tabular-nums text-white">{priceFmt}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
          {unit.recamaras != null ? <span>{unit.recamaras} rec</span> : null}
          {unit.banos != null ? <span>{unit.banos} bñ</span> : null}
          {unit.area_m2 != null ? <span>{unit.area_m2} m²</span> : null}
          {unit.floor != null ? <span>P{unit.floor}</span> : null}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-white/50">
          <span>{days <= 7 ? t('card.newListing') : t('card.daysOnMarket', { days })}</span>
          {hasPartial ? (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
              {t('card.partialSignalsBadge')}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function computeDaysOnMarket(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function translateSignal(key: string, t: ReturnType<typeof useTranslations>): string {
  const safe = `card.demandSignals.${key}`;
  try {
    return t(safe as Parameters<typeof t>[0]);
  } catch {
    return key;
  }
}

function formatSignalValue(v: unknown): string {
  if (typeof v === 'number') return `${Math.round(v * 100) / 100}`;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}
