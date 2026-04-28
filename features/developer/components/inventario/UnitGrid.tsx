'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UnitCard } from '@/features/developer/components/inventario/UnitCard';
import type { InventarioUnidadRow } from '@/features/developer/schemas';

interface UnitGridProps {
  units: ReadonlyArray<InventarioUnidadRow>;
  demandSignalsMap: Map<string, Record<string, unknown> | null>;
  onOpen: (unitId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isFetchingMore: boolean;
  locale: string;
}

const ROW_HEIGHT = 360;

export function UnitGrid({
  units,
  demandSignalsMap,
  onOpen,
  hasMore,
  onLoadMore,
  isFetchingMore,
  locale,
}: UnitGridProps) {
  const t = useTranslations('dev.inventario.list');
  const parentRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const cols = useResponsiveCols(parentRef);

  const rows = useMemo(() => {
    const out: InventarioUnidadRow[][] = [];
    for (let i = 0; i < units.length; i += cols) {
      out.push(units.slice(i, i + cols));
    }
    return out;
  }, [units, cols]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '600px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, isFetchingMore, onLoadMore]);

  return (
    <div ref={parentRef} className="h-[calc(100vh-22rem)] overflow-y-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index] ?? [];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: '12px',
              }}
            >
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {rowItems.map((u) => (
                  <UnitCard
                    key={u.id}
                    unit={u}
                    demandSignals={demandSignalsMap.get(u.id) ?? null}
                    onOpen={onOpen}
                    locale={locale}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div ref={sentinelRef} className="h-4" />
      {isFetchingMore ? (
        <p className="py-4 text-center text-xs text-white/50" role="status">
          {t('loadingMore')}
        </p>
      ) : null}
      {!hasMore && units.length > 0 ? (
        <p className="py-4 text-center text-xs text-white/30">{t('endOfList')}</p>
      ) : null}
    </div>
  );
}

function useResponsiveCols(ref: React.RefObject<HTMLDivElement | null>): number {
  const [cols, setCols] = useState<number>(4);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () => {
      const w = ref.current?.clientWidth ?? window.innerWidth;
      const next = w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1;
      setCols((prev) => (prev === next ? prev : next));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [ref]);
  return cols;
}
