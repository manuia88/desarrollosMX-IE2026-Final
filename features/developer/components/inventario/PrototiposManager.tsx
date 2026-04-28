'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

interface PrototiposManagerProps {
  locale: string;
}

export function PrototiposManager({ locale: _locale }: PrototiposManagerProps) {
  const t = useTranslations('dev.inventario');
  const tProto = useTranslations('dev.inventario.prototipos');
  const proyectosQ = trpc.developer.inventarioListProyectos.useQuery();
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const utils = trpc.useUtils();
  const listQ = trpc.developer.prototipoList.useQuery(
    { proyectoId: proyectoId ?? '', activeOnly: true },
    { enabled: proyectoId != null },
  );
  const createMut = trpc.developer.prototipoCreate.useMutation({
    onSuccess: () => {
      if (proyectoId) {
        utils.developer.prototipoList.invalidate({ proyectoId, activeOnly: true });
      }
      setShowForm(false);
      setDraft(emptyDraft());
    },
  });
  const updateMut = trpc.developer.prototipoUpdate.useMutation({
    onSuccess: () => {
      if (proyectoId) {
        utils.developer.prototipoList.invalidate({ proyectoId, activeOnly: true });
      }
      setShowForm(false);
      setEditingId(null);
      setDraft(emptyDraft());
    },
  });
  const archiveMut = trpc.developer.prototipoDelete.useMutation({
    onSuccess: () => {
      if (proyectoId) {
        utils.developer.prototipoList.invalidate({ proyectoId, activeOnly: true });
      }
    },
  });

  const proyectos = proyectosQ.data ?? [];

  const handleSave = async () => {
    if (!proyectoId) return;
    if (editingId) {
      const patch: Record<string, unknown> = {};
      if (draft.nombre) patch.nombre = draft.nombre;
      if (draft.description) patch.description = draft.description;
      patch.recamaras = draft.recamaras;
      patch.banos = draft.banos;
      patch.m2Base = draft.m2Base;
      patch.precioBaseMxn = draft.precioBaseMxn;
      await updateMut.mutateAsync({
        prototipoId: editingId,
        patch: patch as Parameters<typeof updateMut.mutateAsync>[0]['patch'],
      });
    } else {
      await createMut.mutateAsync({
        proyectoId,
        nombre: draft.nombre,
        ...(draft.description ? { description: draft.description } : {}),
        recamaras: draft.recamaras,
        banos: draft.banos,
        m2Base: draft.m2Base,
        precioBaseMxn: draft.precioBaseMxn,
      });
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{tProto('title')}</h1>
          <p className="text-sm text-white/60">{tProto('subtitle')}</p>
        </div>
        {proyectoId ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft());
              setShowForm(true);
            }}
            className="rounded-full bg-violet-600/85 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
          >
            {tProto('newCta')}
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
          {t('empty.noPrototypes')}
        </p>
      ) : (
        <ul className="space-y-2">
          {listQ.data.map((pr) => (
            <li
              key={pr.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div>
                <div className="font-display font-semibold text-white">{pr.nombre}</div>
                <div className="text-xs text-white/60">
                  {pr.recamaras} rec · {pr.banos} bñ · {pr.m2_base} m² · {pr.precio_base_mxn} MXN
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(pr.id);
                    setDraft({
                      nombre: pr.nombre,
                      description: pr.description ?? '',
                      recamaras: pr.recamaras,
                      banos: pr.banos,
                      m2Base: pr.m2_base,
                      precioBaseMxn: pr.precio_base_mxn,
                    });
                    setShowForm(true);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 hover:bg-white/[0.12]"
                >
                  {tProto('edit')}
                </button>
                <button
                  type="button"
                  onClick={() => archiveMut.mutate({ prototipoId: pr.id })}
                  className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                >
                  {tProto('archive')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && proyectoId ? (
        <PrototipoForm
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
            setDraft(emptyDraft());
          }}
          isPending={createMut.isPending || updateMut.isPending}
        />
      ) : null}
    </div>
  );
}

interface Draft {
  nombre: string;
  description: string;
  recamaras: number;
  banos: number;
  m2Base: number;
  precioBaseMxn: number;
}

function emptyDraft(): Draft {
  return {
    nombre: '',
    description: '',
    recamaras: 2,
    banos: 1,
    m2Base: 60,
    precioBaseMxn: 1500000,
  };
}

function PrototipoForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  isPending,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const t = useTranslations('dev.inventario.prototipos');
  const tActions = useTranslations('dev.inventario.actions');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label={t('fields.nombre')}>
          <input
            value={draft.nombre}
            onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
            required
            minLength={1}
            maxLength={120}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
          />
        </Field>
        <Field label={t('fields.recamaras')}>
          <input
            type="number"
            min={0}
            value={draft.recamaras}
            onChange={(e) => setDraft({ ...draft, recamaras: Number(e.target.value) })}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
          />
        </Field>
        <Field label={t('fields.banos')}>
          <input
            type="number"
            min={0}
            step="0.5"
            value={draft.banos}
            onChange={(e) => setDraft({ ...draft, banos: Number(e.target.value) })}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
          />
        </Field>
        <Field label={t('fields.m2Base')}>
          <input
            type="number"
            min={1}
            value={draft.m2Base}
            onChange={(e) => setDraft({ ...draft, m2Base: Number(e.target.value) })}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
          />
        </Field>
        <Field label={t('fields.precioBaseMxn')}>
          <input
            type="number"
            min={1}
            value={draft.precioBaseMxn}
            onChange={(e) => setDraft({ ...draft, precioBaseMxn: Number(e.target.value) })}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
          />
        </Field>
        <Field label={t('fields.description')}>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.12]"
        >
          {tActions('cancel')}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-violet-600/90 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {tActions('save')}
        </button>
      </div>
    </form>
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
