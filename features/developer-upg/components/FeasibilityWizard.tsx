'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { Input } from '@/shared/ui/primitives/input';
import { Select } from '@/shared/ui/primitives/select';

const TIPO_OPTIONS = [
  { value: 'departamentos', label: 'Departamentos' },
  { value: 'casas', label: 'Casas' },
  { value: 'mixto', label: 'Mixto' },
  { value: 'comercial', label: 'Comercial' },
];

type Tipo = 'departamentos' | 'casas' | 'mixto' | 'comercial';

interface ProgramaState {
  tipo: Tipo;
  unitsTotal: number;
  precioPromedioMxn: number;
  costoTotalEstimateMxn: number;
  constructionMonths: number;
  absorcionMensual: number;
  discountRateAnnual: number;
  amortizacionTerrenoMensual: number;
  gastosFijosMensuales: number;
}

const INITIAL_PROGRAMA: ProgramaState = {
  tipo: 'departamentos',
  unitsTotal: 60,
  precioPromedioMxn: 4_500_000,
  costoTotalEstimateMxn: 150_000_000,
  constructionMonths: 18,
  absorcionMensual: 3,
  discountRateAnnual: 12,
  amortizacionTerrenoMensual: 0,
  gastosFijosMensuales: 50_000,
};

interface FeasibilityWizardProps {
  readonly locale: string;
}

export function FeasibilityWizard({ locale }: FeasibilityWizardProps) {
  const t = useTranslations('dev.upg.feasibility');
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [catastroLink, setCatastroLink] = useState<string>('');
  const [programa, setPrograma] = useState<ProgramaState>(INITIAL_PROGRAMA);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const generateMut = trpc.developerUpg.generateFeasibilityReport.useMutation({
    onSuccess: (data) => {
      router.push(`/${locale}/desarrolladores/intelligence/feasibility?reportId=${data.reportId}`);
    },
    onError: (err) => setSubmitError(err.message),
  });

  const handleSubmit = () => {
    setSubmitError(null);
    generateMut.mutate({
      catastroLink: catastroLink.trim().length > 0 ? catastroLink.trim() : null,
      geometryGeojson: null,
      programa,
    });
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold">{t('newCta')}</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">
          {t('costNote')} · {t('wizardStepLabel', { current: step, total: 4 })}
        </p>
      </header>

      <Card variant="elevated" className="space-y-5 p-6">
        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('stepCatastroTitle')}</h2>
            <label htmlFor="feas-catastro" className="block space-y-1 text-sm">
              <span className="font-medium">{t('catastroLabel')}</span>
              <Input
                id="feas-catastro"
                type="url"
                placeholder="https://catastro.cdmx.gob.mx/predio/..."
                value={catastroLink}
                onChange={(e) => setCatastroLink(e.target.value)}
              />
            </label>
            <p className="text-xs text-[color:var(--color-text-tertiary)]">
              {t('stepCatastroHint')}
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('stepProgramaTitle')}</h2>
            <div className="space-y-1 text-sm">
              <span className="block font-medium">{t('tipoLabel')}</span>
              <Select
                options={TIPO_OPTIONS}
                value={programa.tipo}
                onChange={(v) => setPrograma({ ...programa, tipo: v as Tipo })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="feas-units" className="block space-y-1 text-sm">
                <span className="font-medium">{t('unitsLabel')}</span>
                <Input
                  id="feas-units"
                  type="number"
                  min={1}
                  value={programa.unitsTotal}
                  onChange={(e) => setPrograma({ ...programa, unitsTotal: Number(e.target.value) })}
                />
              </label>
              <label htmlFor="feas-absorcion" className="block space-y-1 text-sm">
                <span className="font-medium">{t('absorcionLabel')}</span>
                <Input
                  id="feas-absorcion"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={programa.absorcionMensual}
                  onChange={(e) =>
                    setPrograma({ ...programa, absorcionMensual: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('stepFinanzasTitle')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="feas-precio" className="block space-y-1 text-sm">
                <span className="font-medium">{t('precioLabel')}</span>
                <Input
                  id="feas-precio"
                  type="number"
                  min={1}
                  value={programa.precioPromedioMxn}
                  onChange={(e) =>
                    setPrograma({ ...programa, precioPromedioMxn: Number(e.target.value) })
                  }
                />
              </label>
              <label htmlFor="feas-costo" className="block space-y-1 text-sm">
                <span className="font-medium">{t('costoLabel')}</span>
                <Input
                  id="feas-costo"
                  type="number"
                  min={1}
                  value={programa.costoTotalEstimateMxn}
                  onChange={(e) =>
                    setPrograma({ ...programa, costoTotalEstimateMxn: Number(e.target.value) })
                  }
                />
              </label>
              <label htmlFor="feas-months" className="block space-y-1 text-sm">
                <span className="font-medium">{t('constructionMonthsLabel')}</span>
                <Input
                  id="feas-months"
                  type="number"
                  min={6}
                  max={60}
                  value={programa.constructionMonths}
                  onChange={(e) =>
                    setPrograma({ ...programa, constructionMonths: Number(e.target.value) })
                  }
                />
              </label>
              <label htmlFor="feas-discount" className="block space-y-1 text-sm">
                <span className="font-medium">{t('discountRateLabel')}</span>
                <Input
                  id="feas-discount"
                  type="number"
                  min={1}
                  max={40}
                  value={programa.discountRateAnnual}
                  onChange={(e) =>
                    setPrograma({ ...programa, discountRateAnnual: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('stepConfirmTitle')}</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>{t('tipoLabel')}:</strong> {programa.tipo}
              </li>
              <li>
                <strong>{t('unitsLabel')}:</strong> {programa.unitsTotal}
              </li>
              <li>
                <strong>{t('precioLabel')}:</strong> ${programa.precioPromedioMxn.toLocaleString()}
              </li>
              <li>
                <strong>{t('costoLabel')}:</strong> $
                {programa.costoTotalEstimateMxn.toLocaleString()}
              </li>
              <li>
                <strong>{t('catastroLabel')}:</strong> {catastroLink || <em>{t('noCatastro')}</em>}
              </li>
            </ul>
            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
            disabled={step === 1 || generateMut.isPending}
          >
            {t('backCta')}
          </Button>
          {step < 4 ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
            >
              {t('nextCta')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={generateMut.isPending}
            >
              {generateMut.isPending ? t('generatingCta') : t('generateCta')}
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}
