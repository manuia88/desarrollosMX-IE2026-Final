'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

interface EsquemasPagoManagerProps {
  locale: string;
}

interface Draft {
  nombre: string;
  engancheePct: number;
  mensualidadesCount: number;
  mesesGracia: number;
  contraEntregaPct: number;
  comisionPct: number;
  ivaCalcLogic: 'exento' | 'incluido' | 'agregado';
  financingPartner: string;
  notes: string;
}

function emptyDraft(): Draft {
  return {
    nombre: '',
    engancheePct: 10,
    mensualidadesCount: 24,
    mesesGracia: 0,
    contraEntregaPct: 80,
    comisionPct: 4,
    ivaCalcLogic: 'agregado',
    financingPartner: '',
    notes: '',
  };
}

export function EsquemasPagoManager({ locale }: EsquemasPagoManagerProps) {
  const t = useTranslations('dev.inventario');
  const tEs = useTranslations('dev.inventario.esquemasPago');
  const tActions = useTranslations('dev.inventario.actions');
  const proyectosQ = trpc.developer.inventarioListProyectos.useQuery();
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [previewBase, setPreviewBase] = useState<number>(2_000_000);

  const utils = trpc.useUtils();
  const listQ = trpc.developer.esquemaPagoList.useQuery(
    { proyectoId: proyectoId ?? '', activeOnly: true },
    { enabled: proyectoId != null },
  );
  const createMut = trpc.developer.esquemaPagoCreate.useMutation({
    onSuccess: () => {
      if (proyectoId) utils.developer.esquemaPagoList.invalidate({ proyectoId, activeOnly: true });
      setShowForm(false);
      setDraft(emptyDraft());
    },
  });
  const updateMut = trpc.developer.esquemaPagoUpdate.useMutation({
    onSuccess: () => {
      if (proyectoId) utils.developer.esquemaPagoList.invalidate({ proyectoId, activeOnly: true });
      setShowForm(false);
      setEditingId(null);
      setDraft(emptyDraft());
    },
  });
  const archiveMut = trpc.developer.esquemaPagoDelete.useMutation({
    onSuccess: () => {
      if (proyectoId) utils.developer.esquemaPagoList.invalidate({ proyectoId, activeOnly: true });
    },
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(n);

  const preview = useMemo(() => {
    const base = previewBase;
    const enganche = (base * draft.engancheePct) / 100;
    const contra = (base * draft.contraEntregaPct) / 100;
    const restante = base - enganche - contra;
    const mensualidad = draft.mensualidadesCount > 0 ? restante / draft.mensualidadesCount : 0;
    const comision = (base * draft.comisionPct) / 100;
    const iva = draft.ivaCalcLogic === 'agregado' ? base * 0.16 : 0;
    const total = base + iva;
    return { base, enganche, contra, mensualidad, comision, iva, total };
  }, [previewBase, draft]);

  const proyectos = proyectosQ.data ?? [];

  const handleSave = async () => {
    if (!proyectoId) return;
    if (editingId) {
      await updateMut.mutateAsync({
        esquemaId: editingId,
        patch: {
          nombre: draft.nombre,
          engancheePct: draft.engancheePct,
          mensualidadesCount: draft.mensualidadesCount,
          mesesGracia: draft.mesesGracia,
          contraEntregaPct: draft.contraEntregaPct,
          comisionPct: draft.comisionPct,
          ivaCalcLogic: draft.ivaCalcLogic,
          ...(draft.financingPartner ? { financingPartner: draft.financingPartner } : {}),
          ...(draft.notes ? { notes: draft.notes } : {}),
        },
      });
    } else {
      await createMut.mutateAsync({
        proyectoId,
        nombre: draft.nombre,
        engancheePct: draft.engancheePct,
        mensualidadesCount: draft.mensualidadesCount,
        mesesGracia: draft.mesesGracia,
        contraEntregaPct: draft.contraEntregaPct,
        comisionPct: draft.comisionPct,
        ivaCalcLogic: draft.ivaCalcLogic,
        ...(draft.financingPartner ? { financingPartner: draft.financingPartner } : {}),
        ...(draft.notes ? { notes: draft.notes } : {}),
      });
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{tEs('title')}</h1>
          <p className="text-sm text-white/60">{tEs('subtitle')}</p>
        </div>
        {proyectoId ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft());
              setShowForm(true);
            }}
            className="rounded-full bg-violet-600/85 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
          >
            {tEs('newCta')}
          </button>
        ) : null}
      </header>

      <label className="block rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <span className="mb-1 block text-[10px] uppercase tracking-wider text-white/50">
          {t('filters.proyecto')}
        </span>
        <select
          value={proyectoId ?? ''}
          onChange={(e) => setProyectoId(e.target.value || null)}
          className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
        >
          <option value="">{t('filters.proyectoAll')}</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id} className="bg-zinc-900">
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      {!proyectoId ? null : listQ.isLoading ? (
        <p className="text-sm text-white/60">{t('actions.loading')}</p>
      ) : !listQ.data || listQ.data.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
          {t('empty.noEsquemas')}
        </p>
      ) : (
        <ul className="space-y-2">
          {listQ.data.map((es) => (
            <li
              key={es.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div>
                <div className="font-display font-semibold text-white">{es.nombre}</div>
                <div className="text-xs text-white/60">
                  {es.enganche_pct}% enganche · {es.mensualidades_count} mensualidades ·{' '}
                  {es.contra_entrega_pct}% contra-entrega · {es.comision_pct}% comisión
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(es.id);
                    setDraft({
                      nombre: es.nombre,
                      engancheePct: es.enganche_pct,
                      mensualidadesCount: es.mensualidades_count,
                      mesesGracia: es.meses_gracia,
                      contraEntregaPct: es.contra_entrega_pct,
                      comisionPct: es.comision_pct,
                      ivaCalcLogic: es.iva_calc_logic as Draft['ivaCalcLogic'],
                      financingPartner: es.financing_partner ?? '',
                      notes: es.notes ?? '',
                    });
                    setShowForm(true);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.12]"
                >
                  {tEs('edit')}
                </button>
                <button
                  type="button"
                  onClick={() => archiveMut.mutate({ esquemaId: es.id })}
                  className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                >
                  {tEs('archive')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && proyectoId ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={tEs('fields.nombre')}>
              <input
                value={draft.nombre}
                required
                minLength={1}
                onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tEs('fields.engancheePct')}>
              <input
                type="number"
                step="0.5"
                value={draft.engancheePct}
                onChange={(e) => setDraft({ ...draft, engancheePct: Number(e.target.value) })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tEs('fields.mensualidadesCount')}>
              <input
                type="number"
                value={draft.mensualidadesCount}
                onChange={(e) => setDraft({ ...draft, mensualidadesCount: Number(e.target.value) })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tEs('fields.mesesGracia')}>
              <input
                type="number"
                value={draft.mesesGracia}
                onChange={(e) => setDraft({ ...draft, mesesGracia: Number(e.target.value) })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tEs('fields.contraEntregaPct')}>
              <input
                type="number"
                step="0.5"
                value={draft.contraEntregaPct}
                onChange={(e) => setDraft({ ...draft, contraEntregaPct: Number(e.target.value) })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tEs('fields.comisionPct')}>
              <input
                type="number"
                step="0.25"
                value={draft.comisionPct}
                onChange={(e) => setDraft({ ...draft, comisionPct: Number(e.target.value) })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tEs('fields.ivaCalcLogic')}>
              <select
                value={draft.ivaCalcLogic}
                onChange={(e) =>
                  setDraft({ ...draft, ivaCalcLogic: e.target.value as Draft['ivaCalcLogic'] })
                }
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              >
                <option value="exento">{tEs('ivaOptions.exento')}</option>
                <option value="incluido">{tEs('ivaOptions.incluido')}</option>
                <option value="agregado">{tEs('ivaOptions.agregado')}</option>
              </select>
            </Field>
            <Field label={tEs('fields.financingPartner')}>
              <input
                value={draft.financingPartner}
                onChange={(e) => setDraft({ ...draft, financingPartner: e.target.value })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tEs('fields.notes')}>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
          </div>

          <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                {tEs('preview.title')}
              </span>
              <input
                type="number"
                value={previewBase}
                onChange={(e) => setPreviewBase(Number(e.target.value))}
                className="w-32 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-right text-xs tabular-nums text-white focus:border-violet-400 focus:outline-none"
              />
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/80">
              <li className="flex justify-between">
                <span className="text-white/50">{tEs('preview.precioBase')}</span>
                <span className="tabular-nums">{fmt(preview.base)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/50">{tEs('preview.engancheMxn')}</span>
                <span className="tabular-nums">{fmt(preview.enganche)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/50">{tEs('preview.mensualidadMxn')}</span>
                <span className="tabular-nums">{fmt(preview.mensualidad)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/50">{tEs('preview.contraEntregaMxn')}</span>
                <span className="tabular-nums">{fmt(preview.contra)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/50">{tEs('preview.comisionMxn')}</span>
                <span className="tabular-nums">{fmt(preview.comision)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/50">{tEs('preview.ivaMxn')}</span>
                <span className="tabular-nums">{fmt(preview.iva)}</span>
              </li>
              <li className="col-span-2 flex justify-between border-t border-white/10 pt-1 font-semibold text-white">
                <span>{tEs('preview.totalMxn')}</span>
                <span className="tabular-nums">{fmt(preview.total)}</span>
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setDraft(emptyDraft());
              }}
              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.12]"
            >
              {tActions('cancel')}
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="rounded-full bg-violet-600/90 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {tActions('save')}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control is rendered via children prop
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-white/50">{label}</span>
      {children}
    </label>
  );
}
