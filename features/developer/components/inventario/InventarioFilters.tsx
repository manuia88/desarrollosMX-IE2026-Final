'use client';

import { useTranslations } from 'next-intl';
import {
  type InventarioListUnidadesInput,
  UNIDAD_STATUS,
  UNIDAD_TIPO,
  type UnidadStatus,
  type UnidadTipo,
} from '@/features/developer/schemas';

export type FiltersState = Pick<
  InventarioListUnidadesInput,
  'proyectoId' | 'status' | 'tipo' | 'priceMin' | 'priceMax' | 'm2Min' | 'm2Max' | 'recamaras'
>;

interface InventarioFiltersProps {
  proyectos: ReadonlyArray<{ id: string; nombre: string }>;
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
}

export function InventarioFilters({ proyectos, filters, onChange }: InventarioFiltersProps) {
  const t = useTranslations('dev.inventario.filters');
  const tStatus = useTranslations('dev.inventario.status');
  const tTipo = useTranslations('dev.inventario.tipo');

  const update = (patch: Partial<FiltersState>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({});
  const hasAny =
    filters.proyectoId != null ||
    filters.status != null ||
    filters.tipo != null ||
    filters.priceMin != null ||
    filters.priceMax != null ||
    filters.m2Min != null ||
    filters.m2Max != null ||
    filters.recamaras != null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      {proyectos.length > 1 ? (
        <select
          aria-label={t('proyecto')}
          value={filters.proyectoId ?? ''}
          onChange={(e) => update({ proyectoId: e.target.value || undefined })}
          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white focus:border-violet-400 focus:outline-none"
        >
          <option value="">{t('proyectoAll')}</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id} className="bg-zinc-900">
              {p.nombre}
            </option>
          ))}
        </select>
      ) : null}

      <select
        aria-label={t('status')}
        value={filters.status ?? ''}
        onChange={(e) =>
          update({ status: (e.target.value || undefined) as UnidadStatus | undefined })
        }
        className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white focus:border-violet-400 focus:outline-none"
      >
        <option value="">{t('statusAll')}</option>
        {UNIDAD_STATUS.map((s) => (
          <option key={s} value={s} className="bg-zinc-900">
            {tStatus(s)}
          </option>
        ))}
      </select>

      <select
        aria-label={t('tipo')}
        value={filters.tipo ?? ''}
        onChange={(e) => update({ tipo: (e.target.value || undefined) as UnidadTipo | undefined })}
        className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white focus:border-violet-400 focus:outline-none"
      >
        <option value="">{t('tipoAll')}</option>
        {UNIDAD_TIPO.map((tp) => (
          <option key={tp} value={tp} className="bg-zinc-900">
            {tTipo(tp)}
          </option>
        ))}
      </select>

      <select
        aria-label={t('recamaras')}
        value={filters.recamaras ?? ''}
        onChange={(e) =>
          update({ recamaras: e.target.value === '' ? undefined : Number(e.target.value) })
        }
        className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white focus:border-violet-400 focus:outline-none"
      >
        <option value="">{t('recamaras')}</option>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n} className="bg-zinc-900">
            {n}+
          </option>
        ))}
      </select>

      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white">
        <span className="text-white/50">{t('priceRange')}</span>
        <input
          type="number"
          inputMode="numeric"
          aria-label={t('priceMin')}
          placeholder={t('priceMin')}
          value={filters.priceMin ?? ''}
          onChange={(e) =>
            update({ priceMin: e.target.value === '' ? undefined : Number(e.target.value) })
          }
          className="w-20 bg-transparent placeholder-white/30 focus:outline-none"
        />
        <span className="text-white/30">–</span>
        <input
          type="number"
          inputMode="numeric"
          aria-label={t('priceMax')}
          placeholder={t('priceMax')}
          value={filters.priceMax ?? ''}
          onChange={(e) =>
            update({ priceMax: e.target.value === '' ? undefined : Number(e.target.value) })
          }
          className="w-20 bg-transparent placeholder-white/30 focus:outline-none"
        />
      </div>

      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white">
        <span className="text-white/50">{t('m2Range')}</span>
        <input
          type="number"
          inputMode="numeric"
          aria-label={t('m2Min')}
          placeholder={t('m2Min')}
          value={filters.m2Min ?? ''}
          onChange={(e) =>
            update({ m2Min: e.target.value === '' ? undefined : Number(e.target.value) })
          }
          className="w-16 bg-transparent placeholder-white/30 focus:outline-none"
        />
        <span className="text-white/30">–</span>
        <input
          type="number"
          inputMode="numeric"
          aria-label={t('m2Max')}
          placeholder={t('m2Max')}
          value={filters.m2Max ?? ''}
          onChange={(e) =>
            update({ m2Max: e.target.value === '' ? undefined : Number(e.target.value) })
          }
          className="w-16 bg-transparent placeholder-white/30 focus:outline-none"
        />
      </div>

      {hasAny ? (
        <button
          type="button"
          onClick={clear}
          className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          {t('clear')}
        </button>
      ) : null}
    </div>
  );
}
