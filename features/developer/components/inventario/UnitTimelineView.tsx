'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { InventarioUnidadRow } from '@/features/developer/schemas';

interface UnitTimelineViewProps {
  units: ReadonlyArray<InventarioUnidadRow>;
  onOpen: (unitId: string) => void;
  locale: string;
}

interface TimelineEntry {
  unit: InventarioUnidadRow;
  date: string;
  isUpdate: boolean;
}

export function UnitTimelineView({ units, onOpen, locale }: UnitTimelineViewProps) {
  const t = useTranslations('dev.inventario.timeline');
  const tStatus = useTranslations('dev.inventario.status');

  const entries = useMemo<TimelineEntry[]>(() => {
    const out: TimelineEntry[] = [];
    for (const u of units) {
      out.push({
        unit: u,
        date: u.updated_at ?? u.created_at,
        isUpdate: u.updated_at !== u.created_at,
      });
    }
    out.sort((a, b) => b.date.localeCompare(a.date));
    return out.slice(0, 100);
  }, [units]);

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-white/60">
        {t('empty')}
      </p>
    );
  }

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">
        {t('title')}
      </h3>
      <ol className="relative space-y-3 border-l border-white/10 pl-4">
        {entries.map((e, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: composite key with unit.id + index for ordered list
          <li key={`${e.unit.id}-${i}`} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-white/20 bg-violet-500" />
            <button
              type="button"
              onClick={() => onOpen(e.unit.id)}
              className="flex w-full items-baseline gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <span className="font-mono text-[10px] text-white/40">{fmt(e.date)}</span>
              <span className="font-display text-sm font-semibold text-white">{e.unit.numero}</span>
              <span className="text-xs text-white/60">{e.unit.proyecto_nombre ?? '—'}</span>
              <span className="ml-auto text-xs text-white/70">{tStatus(e.unit.status)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
