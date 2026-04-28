'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { uploadInventoryPhoto } from '@/features/developer/lib/upload-inventory-photo';
import { trpc } from '@/shared/lib/trpc/client';

interface AvanceObraManagerProps {
  locale: string;
}

interface AvanceRow {
  id: string;
  proyecto_id: string;
  fecha: string;
  etapa: string;
  porcentaje: number;
  fotos_urls: unknown;
  drone_photo_url: string | null;
  geo_location: unknown;
  notes: string | null;
  autor_id: string | null;
  created_at: string;
}

type Etapa =
  | 'cimentacion'
  | 'estructura'
  | 'albanileria'
  | 'instalaciones'
  | 'acabados'
  | 'entrega';
const ETAPAS: Etapa[] = [
  'cimentacion',
  'estructura',
  'albanileria',
  'instalaciones',
  'acabados',
  'entrega',
];

interface Draft {
  fecha: string;
  etapa: Etapa;
  porcentaje: number;
  notes: string;
  dronePhotoUrl: string;
  geoLat: string;
  geoLng: string;
  fotos: string[];
}

function emptyDraft(): Draft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    fecha: today,
    etapa: 'cimentacion',
    porcentaje: 0,
    notes: '',
    dronePhotoUrl: '',
    geoLat: '',
    geoLng: '',
    fotos: [],
  };
}

export function AvanceObraManager({ locale }: AvanceObraManagerProps) {
  const t = useTranslations('dev.inventario');
  const tAv = useTranslations('dev.inventario.avanceObra');
  const tActions = useTranslations('dev.inventario.actions');
  const proyectosQ = trpc.developer.inventarioListProyectos.useQuery();
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();
  const listQ = trpc.developer.avanceObraList.useQuery(
    { proyectoId: proyectoId ?? '', limit: 60 },
    { enabled: proyectoId != null },
  );
  const createMut = trpc.developer.avanceObraCreate.useMutation({
    onSuccess: () => {
      if (proyectoId) utils.developer.avanceObraList.invalidate({ proyectoId, limit: 60 });
      setShowForm(false);
      setDraft(emptyDraft());
    },
  });
  const deleteMut = trpc.developer.avanceObraDelete.useMutation({
    onSuccess: () => {
      if (proyectoId) utils.developer.avanceObraList.invalidate({ proyectoId, limit: 60 });
    },
  });

  const proyectos = proyectosQ.data ?? [];

  const handleUploadFotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !proyectoId) return;
    setUploading(true);
    const urls: string[] = [];
    try {
      for (const f of Array.from(files)) {
        const r = await uploadInventoryPhoto({ file: f, proyectoId });
        urls.push(r.publicUrl);
      }
      setDraft((d) => ({ ...d, fotos: [...d.fotos, ...urls] }));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!proyectoId) return;
    const geo =
      draft.geoLat && draft.geoLng
        ? { lat: Number(draft.geoLat), lng: Number(draft.geoLng) }
        : undefined;
    await createMut.mutateAsync({
      proyectoId,
      fecha: draft.fecha,
      etapa: draft.etapa,
      porcentaje: draft.porcentaje,
      fotosUrls: draft.fotos,
      ...(draft.dronePhotoUrl ? { dronePhotoUrl: draft.dronePhotoUrl } : {}),
      ...(geo ? { geoLocation: geo } : {}),
      ...(draft.notes ? { notes: draft.notes } : {}),
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{tAv('title')}</h1>
          <p className="text-sm text-white/60">{tAv('subtitle')}</p>
        </div>
        {proyectoId ? (
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft());
              setShowForm(true);
            }}
            className="rounded-full bg-violet-600/85 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
          >
            {tAv('newCta')}
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
          {t('empty.noAvance')}
        </p>
      ) : (
        <ul className="space-y-2">
          {(listQ.data as ReadonlyArray<AvanceRow>).map((a) => (
            <li key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-white/40">
                    {new Intl.DateTimeFormat(locale, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(a.fecha))}
                  </span>
                  <span className="font-display font-semibold text-white">
                    {tAv(`etapa.${a.etapa as Etapa}`)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate({ avanceId: a.id })}
                  className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-500/20"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-violet-500"
                  style={{ width: `${a.porcentaje}%` }}
                />
              </div>
              <div className="mt-1 flex items-baseline justify-between text-xs text-white/60">
                <span>{a.porcentaje}%</span>
                {a.notes ? <span className="line-clamp-1">{a.notes}</span> : null}
              </div>
              {a.fotos_urls && Array.isArray(a.fotos_urls) && a.fotos_urls.length > 0 ? (
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {(a.fotos_urls as string[]).slice(0, 8).map((u, i) => (
                    // biome-ignore lint/performance/noImgElement: user-uploaded thumbnail; CDN handles optimization
                    <img
                      // biome-ignore lint/suspicious/noArrayIndexKey: composite key url+idx for thumbnail grid
                      key={`${u}-${i}`}
                      src={u}
                      alt=""
                      className="aspect-square w-full rounded object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
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
            <Field label={tAv('fields.fecha')}>
              <input
                type="date"
                required
                value={draft.fecha}
                onChange={(e) => setDraft({ ...draft, fecha: e.target.value })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tAv('fields.etapa')}>
              <select
                value={draft.etapa}
                onChange={(e) => setDraft({ ...draft, etapa: e.target.value as Etapa })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              >
                {ETAPAS.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900">
                    {tAv(`etapa.${s}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tAv('fields.porcentaje')}>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.porcentaje}
                  onChange={(e) => setDraft({ ...draft, porcentaje: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="w-12 text-right font-mono text-sm tabular-nums text-white">
                  {draft.porcentaje}%
                </span>
              </div>
            </Field>
            <Field label={tAv('fields.dronePhotoUrl')}>
              <input
                type="url"
                value={draft.dronePhotoUrl}
                onChange={(e) => setDraft({ ...draft, dronePhotoUrl: e.target.value })}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
            <Field label={tAv('fields.geoLocation')}>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="lat"
                  value={draft.geoLat}
                  onChange={(e) => setDraft({ ...draft, geoLat: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="lng"
                  value={draft.geoLng}
                  onChange={(e) => setDraft({ ...draft, geoLng: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
                />
              </div>
            </Field>
            <Field label={tAv('fields.notes')}>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </Field>
          </div>

          <div>
            <span className="mb-2 block text-[10px] uppercase tracking-wider text-white/50">
              {tAv('uploadFotos')}
            </span>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleUploadFotos(e.target.files)}
              className="text-xs text-white/70"
            />
            {uploading ? <p className="mt-1 text-xs text-violet-300">…</p> : null}
            {draft.fotos.length > 0 ? (
              <div className="mt-2 grid grid-cols-4 gap-1">
                {draft.fotos.map((u, i) => (
                  // biome-ignore lint/performance/noImgElement: just-uploaded thumbnail preview
                  <img
                    // biome-ignore lint/suspicious/noArrayIndexKey: composite key url+idx for thumbnail grid
                    key={`${u}-${i}`}
                    src={u}
                    alt=""
                    className="aspect-square w-full rounded object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setDraft(emptyDraft());
              }}
              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.12]"
            >
              {tActions('cancel')}
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
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
