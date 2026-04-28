'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UnitPhotosUploader } from '@/features/developer/components/inventario/UnitPhotosUploader';
import { UNIDAD_STATUS, UNIDAD_TIPO } from '@/features/developer/schemas';
import { trpc } from '@/shared/lib/trpc/client';

type TabKey = 'info' | 'precios' | 'cambios' | 'ocupacion' | 'leads';

interface UnitDrawerProps {
  unidadId: string | null;
  onClose: () => void;
  locale: string;
}

export function UnitDrawer({ unidadId, onClose, locale }: UnitDrawerProps) {
  const t = useTranslations('dev.inventario.drawer');
  const open = unidadId != null;
  const [tab, setTab] = useState<TabKey>('info');

  useEffect(() => {
    if (!open) return;
    setTab('info');
  }, [open]);

  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-white/10 bg-zinc-950 shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
        >
          {unidadId ? (
            <UnitDrawerInner
              unidadId={unidadId}
              tab={tab}
              setTab={setTab}
              onClose={onClose}
              locale={locale}
              t={t}
            />
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

interface InnerProps {
  unidadId: string;
  tab: TabKey;
  setTab: (k: TabKey) => void;
  onClose: () => void;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}

function UnitDrawerInner({ unidadId, tab, setTab, onClose, locale, t }: InnerProps) {
  const unitQ = trpc.developer.inventarioGetUnidad.useQuery({ unidadId });
  const tabs: TabKey[] = ['info', 'precios', 'cambios', 'ocupacion', 'leads'];

  return (
    <>
      <header className="flex items-center justify-between border-b border-white/10 bg-zinc-900/60 px-5 py-3">
        <RadixDialog.Title className="font-display text-lg font-semibold text-white">
          {unitQ.data ? t('title', { numero: unitQ.data.numero }) : '...'}
        </RadixDialog.Title>
        <RadixDialog.Close asChild>
          <button
            type="button"
            aria-label={t('close')}
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
          >
            ×
          </button>
        </RadixDialog.Close>
      </header>

      <nav
        aria-label={String(t('title', { numero: '' }))}
        className="flex gap-1 overflow-x-auto border-b border-white/10 bg-zinc-900/40 px-3 py-2"
      >
        {tabs.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${
              tab === k
                ? 'bg-violet-600/80 text-white'
                : 'border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-5">
        {!unitQ.data ? (
          <p className="text-sm text-white/50">...</p>
        ) : tab === 'info' ? (
          <InfoTab unidad={unitQ.data} onSaved={() => unitQ.refetch()} />
        ) : tab === 'precios' ? (
          <PreciosTab unidadId={unidadId} currentPrice={unitQ.data.price_mxn} locale={locale} />
        ) : tab === 'cambios' ? (
          <CambiosTab unidadId={unidadId} locale={locale} />
        ) : tab === 'ocupacion' ? (
          <OcupacionTab unidadId={unidadId} locale={locale} />
        ) : (
          <LeadsTab unidadId={unidadId} locale={locale} />
        )}
      </div>
    </>
  );
}

interface UnidadDetail {
  id: string;
  proyecto_id: string;
  numero: string;
  tipo: 'departamento' | 'casa' | 'townhouse' | 'loft' | 'penthouse' | 'estudio';
  status: 'disponible' | 'apartada' | 'vendida' | 'reservada' | 'bloqueada';
  recamaras: number | null;
  banos: number | null;
  parking: number | null;
  area_m2: number | null;
  price_mxn: number | null;
  maintenance_fee_mxn: number | null;
  floor: number | null;
  photos: string[];
  proyecto_nombre: string | null;
}

function InfoTab({ unidad, onSaved }: { unidad: UnidadDetail; onSaved: () => void }) {
  const t = useTranslations('dev.inventario.info');
  const tStatus = useTranslations('dev.inventario.status');
  const tTipo = useTranslations('dev.inventario.tipo');
  const updateMut = trpc.developer.inventarioUpdateUnidad.useMutation({
    onSuccess: () => {
      onSaved();
    },
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    numero: unidad.numero,
    tipo: unidad.tipo,
    status: unidad.status,
    recamaras: unidad.recamaras,
    banos: unidad.banos,
    parking: unidad.parking,
    area_m2: unidad.area_m2,
    price_mxn: unidad.price_mxn,
    maintenance_fee_mxn: unidad.maintenance_fee_mxn,
    floor: unidad.floor,
    motivoPriceChange: '',
  });

  const handleSave = async () => {
    const patch: Record<string, unknown> = {};
    if (draft.numero !== unidad.numero) patch.numero = draft.numero;
    if (draft.tipo !== unidad.tipo) patch.tipo = draft.tipo;
    if (draft.status !== unidad.status) patch.status = draft.status;
    if (draft.recamaras !== unidad.recamaras && draft.recamaras != null)
      patch.recamaras = draft.recamaras;
    if (draft.banos !== unidad.banos && draft.banos != null) patch.banos = draft.banos;
    if (draft.parking !== unidad.parking && draft.parking != null) patch.parking = draft.parking;
    if (draft.area_m2 !== unidad.area_m2 && draft.area_m2 != null) patch.area_m2 = draft.area_m2;
    if (draft.price_mxn !== unidad.price_mxn && draft.price_mxn != null)
      patch.price_mxn = draft.price_mxn;
    if (
      draft.maintenance_fee_mxn !== unidad.maintenance_fee_mxn &&
      draft.maintenance_fee_mxn != null
    )
      patch.maintenance_fee_mxn = draft.maintenance_fee_mxn;
    if (draft.floor !== unidad.floor && draft.floor != null) patch.floor = draft.floor;
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    await updateMut.mutateAsync({
      unidadId: unidad.id,
      // biome-ignore lint/suspicious/noExplicitAny: tRPC patch type instantiation depth limit
      patch: patch as any,
      ...(draft.motivoPriceChange ? { motivoPriceChange: draft.motivoPriceChange } : {}),
    });
    setEditing(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/[0.12]"
          >
            {t('edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft({
                  numero: unidad.numero,
                  tipo: unidad.tipo,
                  status: unidad.status,
                  recamaras: unidad.recamaras,
                  banos: unidad.banos,
                  parking: unidad.parking,
                  area_m2: unidad.area_m2,
                  price_mxn: unidad.price_mxn,
                  maintenance_fee_mxn: unidad.maintenance_fee_mxn,
                  floor: unidad.floor,
                  motivoPriceChange: '',
                });
              }}
              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.12]"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMut.isPending}
              className="rounded-full bg-violet-600/90 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {t('save')}
            </button>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <FieldRow label={t('fields.numero')}>
          {editing ? (
            <input
              value={draft.numero}
              onChange={(e) => setDraft({ ...draft, numero: e.target.value })}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
            />
          ) : (
            <span className="text-white">{unidad.numero}</span>
          )}
        </FieldRow>
        <FieldRow label={t('fields.tipo')}>
          {editing ? (
            <select
              value={draft.tipo}
              onChange={(e) => setDraft({ ...draft, tipo: e.target.value as typeof draft.tipo })}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
            >
              {UNIDAD_TIPO.map((tp) => (
                <option key={tp} value={tp} className="bg-zinc-900">
                  {tTipo(tp)}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-white">{tTipo(unidad.tipo)}</span>
          )}
        </FieldRow>
        <FieldRow label={t('fields.status')}>
          {editing ? (
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as typeof draft.status })
              }
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
            >
              {UNIDAD_STATUS.map((s) => (
                <option key={s} value={s} className="bg-zinc-900">
                  {tStatus(s)}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-white">{tStatus(unidad.status)}</span>
          )}
        </FieldRow>
        <FieldRow label={t('fields.price_mxn')}>
          {editing ? (
            <input
              type="number"
              inputMode="numeric"
              value={draft.price_mxn ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  price_mxn: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
            />
          ) : (
            <span className="font-mono text-white">{unidad.price_mxn ?? '—'}</span>
          )}
        </FieldRow>
        <FieldRow label={t('fields.recamaras')}>
          {editing ? (
            <input
              type="number"
              value={draft.recamaras ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  recamaras: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
            />
          ) : (
            <span className="text-white">{unidad.recamaras ?? '—'}</span>
          )}
        </FieldRow>
        <FieldRow label={t('fields.banos')}>
          {editing ? (
            <input
              type="number"
              value={draft.banos ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, banos: e.target.value === '' ? null : Number(e.target.value) })
              }
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
            />
          ) : (
            <span className="text-white">{unidad.banos ?? '—'}</span>
          )}
        </FieldRow>
        <FieldRow label={t('fields.area_m2')}>
          {editing ? (
            <input
              type="number"
              value={draft.area_m2 ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  area_m2: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
            />
          ) : (
            <span className="text-white">{unidad.area_m2 ?? '—'}</span>
          )}
        </FieldRow>
        <FieldRow label={t('fields.floor')}>
          {editing ? (
            <input
              type="number"
              value={draft.floor ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, floor: e.target.value === '' ? null : Number(e.target.value) })
              }
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
            />
          ) : (
            <span className="text-white">{unidad.floor ?? '—'}</span>
          )}
        </FieldRow>
      </dl>

      {editing && draft.price_mxn !== unidad.price_mxn ? (
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-white/50">
            {t('fields.motivoPriceChange')}
          </span>
          <input
            value={draft.motivoPriceChange}
            onChange={(e) => setDraft({ ...draft, motivoPriceChange: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white focus:border-violet-400 focus:outline-none"
          />
        </label>
      ) : null}

      <UnitPhotosUploader
        unidadId={unidad.id}
        proyectoId={unidad.proyecto_id}
        photos={unidad.photos ?? []}
        onChanged={onSaved}
      />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-[10px] uppercase tracking-wider text-white/50">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PreciosTab({
  unidadId,
  currentPrice,
  locale,
}: {
  unidadId: string;
  currentPrice: number | null;
  locale: string;
}) {
  const t = useTranslations('dev.inventario.precios');
  const q = trpc.developer.inventarioGetPriceHistory.useQuery({ unidadId, limit: 50 });
  const fmtMxn = (n: number | null | undefined) =>
    n == null
      ? '—'
      : new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'MXN',
          maximumFractionDigits: 0,
        }).format(n);

  const data = (q.data ?? [])
    .map((r) => ({
      fecha: r.fecha,
      precio: r.precio_nuevo_mxn,
      cambio: r.cambio_pct,
      motivo: r.motivo,
      anterior: r.precio_anterior_mxn,
    }))
    .reverse();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="text-[10px] uppercase tracking-wider text-white/50">
          {t('currentPrice')}
        </div>
        <div className="font-display text-2xl font-bold tabular-nums text-white">
          {fmtMxn(currentPrice)}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
          {t('chartTitle')}
        </div>
        <div className="h-48 w-full" role="img" aria-label={t('chartAria')}>
          {data.length === 0 ? (
            <p className="flex h-full items-center justify-center text-xs text-white/40">
              {t('noHistory')}
            </p>
          ) : (
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  tickFormatter={(v) =>
                    new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
                      new Date(v),
                    )
                  }
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat(locale, { notation: 'compact' }).format(v)
                  }
                />
                <RTooltip
                  contentStyle={{
                    background: 'rgb(24 24 27)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: 'rgb(244 244 245)' }}
                  formatter={(value) => fmtMxn(typeof value === 'number' ? value : Number(value))}
                />
                <Line
                  type="monotone"
                  dataKey="precio"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#a78bfa' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {data.length > 0 ? (
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-white/50">
              <th className="px-2 py-1.5">{t('tableHeaders.fecha')}</th>
              <th className="px-2 py-1.5 text-right">{t('tableHeaders.anterior')}</th>
              <th className="px-2 py-1.5 text-right">{t('tableHeaders.nuevo')}</th>
              <th className="px-2 py-1.5 text-right">{t('tableHeaders.cambio')}</th>
              <th className="px-2 py-1.5">{t('tableHeaders.motivo')}</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((r) => (
              <tr key={r.id} className="border-b border-white/5 text-white/85">
                <td className="px-2 py-1.5 text-white/60">
                  {new Intl.DateTimeFormat(locale, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(r.fecha))}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {fmtMxn(r.precio_anterior_mxn)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {fmtMxn(r.precio_nuevo_mxn)}
                </td>
                <td
                  className={`px-2 py-1.5 text-right tabular-nums ${
                    r.cambio_pct == null
                      ? 'text-white/40'
                      : r.cambio_pct >= 0
                        ? 'text-emerald-300'
                        : 'text-rose-300'
                  }`}
                >
                  {r.cambio_pct == null
                    ? '—'
                    : `${r.cambio_pct >= 0 ? '+' : ''}${r.cambio_pct.toFixed(1)}%`}
                </td>
                <td className="px-2 py-1.5 text-white/60">{r.motivo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

interface ChangeLogRow {
  id: string;
  event_type: string;
  payload: unknown;
  actor_id: string | null;
  occurred_at: string;
}

function CambiosTab({ unidadId, locale }: { unidadId: string; locale: string }) {
  const t = useTranslations('dev.inventario.cambios');
  const q = trpc.developer.inventarioGetChangeLog.useQuery({ unidadId, limit: 50 });

  if (q.isLoading) return <p className="text-sm text-white/50">{t('loading')}</p>;
  const rows = (q.data ?? []) as ReadonlyArray<ChangeLogRow>;
  if (rows.length === 0) {
    return <p className="text-sm text-white/50">{t('empty')}</p>;
  }

  return (
    <ol className="relative space-y-3 border-l border-white/10 pl-4">
      {rows.map((r) => (
        <li key={r.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-white/20 bg-violet-500" />
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                {translateEvent(r.event_type, t)}
              </span>
              <span className="font-mono text-[10px] text-white/40">
                {new Intl.DateTimeFormat(locale, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(r.occurred_at))}
              </span>
            </div>
            {r.payload ? (
              <pre className="mt-1 overflow-x-auto rounded bg-zinc-900/60 p-2 text-[10px] text-white/70">
                {JSON.stringify(r.payload, null, 2)}
              </pre>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function translateEvent(eventType: string, t: ReturnType<typeof useTranslations>): string {
  const safe = `eventTypes.${eventType}`;
  try {
    return t(safe as Parameters<typeof t>[0]);
  } catch {
    return eventType;
  }
}

function OcupacionTab({ unidadId, locale }: { unidadId: string; locale: string }) {
  const t = useTranslations('dev.inventario.ocupacion');
  const q = trpc.developer.inventarioGetReservas.useQuery({ unidadId });

  if (q.isLoading) return <p className="text-sm text-white/50">{t('loading')}</p>;
  if (!q.data || q.data.length === 0) {
    return <p className="text-sm text-white/50">{t('empty')}</p>;
  }

  return (
    <ul className="space-y-2">
      {q.data.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm"
        >
          <div className="flex flex-col">
            <span className="font-display font-semibold text-white">
              {r.codigo ?? r.id.slice(0, 8)}
            </span>
            <span className="text-xs text-white/60">
              {t('stage')}: {r.status} · {r.operacion_type}
            </span>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-white">
              {new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: r.amount_currency ?? 'MXN',
                maximumFractionDigits: 0,
              }).format(r.amount)}
            </div>
            <div className="text-[10px] text-white/40">
              {r.created_at
                ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
                    new Date(r.created_at),
                  )
                : '—'}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LeadsTab({ unidadId, locale }: { unidadId: string; locale: string }) {
  const t = useTranslations('dev.inventario.leads');
  const q = trpc.developer.inventarioGetLeads.useQuery({ unidadId, limit: 20 });

  if (q.isLoading) return <p className="text-sm text-white/50">{t('loading')}</p>;
  const leads = q.data?.leads ?? [];

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-amber-400/20 bg-amber-500/[0.04] p-2 text-[11px] text-amber-200/90">
        {t('scopeProjectBanner')}
      </p>
      {leads.length === 0 ? (
        <p className="text-sm text-white/50">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {leads.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-white">{l.contacto_name}</span>
                <span className="text-xs text-white/60">
                  {l.contacto_email ?? l.contacto_phone ?? '—'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/70">{l.status}</div>
                <div className="text-[10px] text-white/40">
                  {l.created_at
                    ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
                        new Date(l.created_at),
                      )
                    : '—'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
