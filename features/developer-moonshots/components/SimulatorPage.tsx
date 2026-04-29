'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { SimulatorOutput } from '@/features/developer-moonshots/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

type Step = 1 | 2 | 3 | 4;

export function SimulatorPage() {
  const t = useTranslations('dev.moonshots.simulator');
  const [step, setStep] = useState<Step>(1);
  const [latestResult, setLatestResult] = useState<SimulatorOutput | null>(null);

  const [ubicacion, setUbicacion] = useState({
    zoneId: '',
    ciudad: 'CDMX',
    colonia: 'Roma Norte',
    countryCode: 'MX' as const,
  });
  const [tipologia, setTipologia] = useState({
    tipo: 'vertical' as 'vertical' | 'horizontal' | 'mixto',
    unidades: 60,
    m2Promedio: 80,
    amenidades: [] as string[],
  });
  const [pricing, setPricing] = useState({
    precioM2Mxn: 80_000,
    paymentSplit: { enganche: 0.2, mensualidades: 24, contraEntrega: 0.6 },
    costoConstruccionM2Mxn: 18_000,
    costoTerrenoMxn: 0,
    gastosFijosMxn: 150_000,
  });

  const mutation = trpc.developerMoonshots.simulateProject.useMutation({
    onSuccess: (data) => setLatestResult(data),
  });

  const onSimulate = () => {
    const ubicacionPayload =
      ubicacion.zoneId.length === 36 ? ubicacion : { ...ubicacion, zoneId: undefined };
    mutation.mutate({
      ubicacion: ubicacionPayload,
      tipologia,
      pricing,
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
        <div className="flex gap-2 text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className="rounded-full px-3 py-1"
              style={{
                background: s === step ? 'rgba(99,102,241,0.32)' : 'rgba(255,255,255,0.06)',
                color: s === step ? '#fff' : 'var(--canon-cream-3)',
              }}
            >
              {t(`step${s}`)}
            </span>
          ))}
        </div>
      </header>

      <Card className="space-y-4 p-6">
        {step === 1 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="Ciudad"
              value={ubicacion.ciudad}
              onChange={(v) => setUbicacion({ ...ubicacion, ciudad: v })}
            />
            <Field
              label="Colonia"
              value={ubicacion.colonia}
              onChange={(v) => setUbicacion({ ...ubicacion, colonia: v })}
            />
            <Field
              label="Zone ID (UUID opcional)"
              value={ubicacion.zoneId}
              onChange={(v) => setUbicacion({ ...ubicacion, zoneId: v })}
            />
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SelectField
              label="Tipo"
              value={tipologia.tipo}
              options={[
                { value: 'vertical', label: 'Vertical' },
                { value: 'horizontal', label: 'Horizontal' },
                { value: 'mixto', label: 'Mixto' },
              ]}
              onChange={(v) => setTipologia({ ...tipologia, tipo: v as typeof tipologia.tipo })}
            />
            <NumField
              label="Unidades"
              value={tipologia.unidades}
              onChange={(v) => setTipologia({ ...tipologia, unidades: v })}
            />
            <NumField
              label="m² promedio"
              value={tipologia.m2Promedio}
              onChange={(v) => setTipologia({ ...tipologia, m2Promedio: v })}
            />
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <NumField
              label="Precio/m² MXN"
              value={pricing.precioM2Mxn}
              onChange={(v) => setPricing({ ...pricing, precioM2Mxn: v })}
            />
            <NumField
              label="Costo construcción/m² MXN"
              value={pricing.costoConstruccionM2Mxn}
              onChange={(v) => setPricing({ ...pricing, costoConstruccionM2Mxn: v })}
            />
            <NumField
              label="Costo terreno MXN"
              value={pricing.costoTerrenoMxn}
              onChange={(v) => setPricing({ ...pricing, costoTerrenoMxn: v })}
            />
            <NumField
              label="Gastos fijos MXN/mes"
              value={pricing.gastosFijosMxn}
              onChange={(v) => setPricing({ ...pricing, gastosFijosMxn: v })}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--canon-cream-2)' }}>
              {ubicacion.colonia}, {ubicacion.ciudad} · {tipologia.unidades} unidades ·{' '}
              {tipologia.m2Promedio}m² · ${pricing.precioM2Mxn.toLocaleString('es-MX')} /m²
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={onSimulate}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t('loading') : t('submit')}
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
            disabled={step === 1}
          >
            ←
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
            disabled={step === 4}
          >
            →
          </Button>
        </div>
      </Card>

      {latestResult && (
        <Card className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Metric label={t('outputAbsorcion')} value={latestResult.outputs.absorcionMeses} />
            <Metric
              label={t('outputRevenue')}
              value={`$${latestResult.outputs.revenueMxn.toLocaleString('es-MX')}`}
            />
            <Metric
              label={t('outputIRR')}
              value={
                latestResult.outputs.irr !== null
                  ? `${(latestResult.outputs.irr * 100).toFixed(1)}%`
                  : 'n/a'
              }
            />
            <Metric
              label={t('outputNPV')}
              value={`$${latestResult.outputs.npvMxn.toLocaleString('es-MX')}`}
            />
            <Metric label={t('outputBreakEven')} value={latestResult.outputs.breakEvenMonth} />
            <Metric label="PMF Score" value={latestResult.outputs.pmfScore} />
          </div>

          {latestResult.outputs.riskFlags.length > 0 && (
            <div className="text-[12px]" style={{ color: '#fbbf24' }}>
              ⚠ {latestResult.outputs.riskFlags.join(' · ')}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--canon-cream-3)' }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--canon-cream)',
        }}
      />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--canon-cream-3)' }}
      >
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="rounded-lg px-3 py-2 text-sm"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--canon-cream)',
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--canon-cream-3)' }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--canon-cream)',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--canon-cream-3)' }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-xl font-bold tabular-nums"
        style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
      >
        {value ?? 'n/a'}
      </div>
    </div>
  );
}
