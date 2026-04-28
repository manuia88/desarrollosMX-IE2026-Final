'use client';

import { useTranslations } from 'next-intl';
import type { InventarioUnidadRow } from '@/features/developer/schemas';

interface UnitTableProps {
  units: ReadonlyArray<InventarioUnidadRow>;
  onOpen: (unitId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isFetchingMore: boolean;
  locale: string;
}

const STATUS_DOT: Record<string, string> = {
  disponible: 'bg-emerald-400',
  apartada: 'bg-amber-400',
  reservada: 'bg-amber-400',
  vendida: 'bg-blue-400',
  bloqueada: 'bg-zinc-400',
};

const DEMAND_DOT: Record<string, string> = {
  red: 'bg-rose-500',
  amber: 'bg-amber-400',
  green: 'bg-emerald-500',
};

export function UnitTable({
  units,
  onOpen,
  hasMore,
  onLoadMore,
  isFetchingMore,
  locale,
}: UnitTableProps) {
  const t = useTranslations('dev.inventario.table');
  const tStatus = useTranslations('dev.inventario.status');
  const tTipo = useTranslations('dev.inventario.tipo');
  const tList = useTranslations('dev.inventario.list');
  const fmtPrice = (n: number | null) =>
    n == null
      ? '—'
      : new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'MXN',
          maximumFractionDigits: 0,
        }).format(n);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="max-h-[calc(100vh-22rem)] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur">
            <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-white/50">
              <th className="px-3 py-2 font-semibold">{t('numero')}</th>
              <th className="px-3 py-2 font-semibold">{t('proyecto')}</th>
              <th className="px-3 py-2 font-semibold">{t('tipo')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('rec')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('banos')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('m2')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('precio')}</th>
              <th className="px-3 py-2 font-semibold">{t('status')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('demanda')}</th>
              <th className="px-3 py-2 text-right font-semibold">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr
                key={u.id}
                className="border-b border-white/5 text-white/85 transition-colors hover:bg-white/[0.04]"
              >
                <td className="px-3 py-2 font-display font-semibold text-white">{u.numero}</td>
                <td className="px-3 py-2 text-white/70">{u.proyecto_nombre ?? '—'}</td>
                <td className="px-3 py-2">{tTipo(u.tipo)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.recamaras ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.banos ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.area_m2 ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-white">
                  {fmtPrice(u.price_mxn)}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${STATUS_DOT[u.status] ?? 'bg-zinc-400'}`}
                    />
                    {tStatus(u.status)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        DEMAND_DOT[u.demand_color ?? 'red'] ?? 'bg-rose-500'
                      }`}
                    />
                    <span className="font-mono tabular-nums">{u.demand_score_30d}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(u.id)}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white transition-colors hover:bg-white/[0.12]"
                  >
                    {t('open')}
                  </button>
                </td>
              </tr>
            ))}
            {units.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm text-white/50">
                  {tList('endOfList')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {hasMore ? (
        <div className="flex justify-center border-t border-white/10 bg-white/[0.02] py-3">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingMore}
            className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs text-white transition-colors hover:bg-white/[0.12] disabled:opacity-50"
          >
            {isFetchingMore ? tList('loadingMore') : tList('loadMore')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
