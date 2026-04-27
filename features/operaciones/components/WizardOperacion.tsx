'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  type CreateOperacionInput,
  countryCodeEnum,
  OPERACION_CURRENCY,
  type OperacionCurrency,
  type OperacionSide,
  type PropiedadType,
} from '@/features/operaciones/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { ComisionCalculator, type ComisionCalculatorValue } from './ComisionCalculator';
import { PegarLigaInput } from './PegarLigaInput';
import { PropiedadBrowser } from './PropiedadBrowser';
import { SideSelector } from './SideSelector';

export interface WizardOperacionProps {
  defaultCountry?: 'MX' | 'CO' | 'AR' | 'BR' | 'US';
  onCreated?: (id: string, codigo: string) => void;
  onCancel?: () => void;
}

interface DraftState {
  countryCode: 'MX' | 'CO' | 'AR' | 'BR' | 'US';
  side: OperacionSide | null;
  comprador: { asesorId: string; contactoId: string };
  vendedor: {
    propiedadType: PropiedadType | null;
    propiedadId: string;
    asesorVendedorId: string;
    asesorProductorId: string;
    propietarioContactoId: string;
  };
  estado: {
    fechaCierre: string;
    cierreAmount: string;
    cierreCurrency: OperacionCurrency;
    reservaAmount: string;
    reservaCurrency: OperacionCurrency | '';
    promocionAmount: string;
    promocionCurrency: OperacionCurrency | '';
  };
  comision: ComisionCalculatorValue;
  notas: string;
}

const STEP_TITLES = [
  'wizard.step1Title',
  'wizard.step2Title',
  'wizard.step3Title',
  'wizard.step4Title',
  'wizard.step5Title',
  'wizard.step6Title',
] as const;

function defaultDraft(country: DraftState['countryCode']): DraftState {
  const tenDaysFromNow = new Date();
  tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
  return {
    countryCode: country,
    side: null,
    comprador: { asesorId: '', contactoId: '' },
    vendedor: {
      propiedadType: null,
      propiedadId: '',
      asesorVendedorId: '',
      asesorProductorId: '',
      propietarioContactoId: '',
    },
    estado: {
      fechaCierre: tenDaysFromNow.toISOString().slice(0, 10),
      cierreAmount: '',
      cierreCurrency: country === 'US' ? 'USD' : 'MXN',
      reservaAmount: '',
      reservaCurrency: '',
      promocionAmount: '',
      promocionCurrency: '',
    },
    comision: {
      comisionPct: 4,
      ivaPct: 16,
      splitDmxPct: 20,
      declaracionJurada: false,
    },
    notas: '',
  };
}

export function WizardOperacion({
  defaultCountry = 'MX',
  onCreated,
  onCancel,
}: WizardOperacionProps) {
  const t = useTranslations('Operaciones');
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(() => defaultDraft(defaultCountry));
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createMutation = trpc.operaciones.createOperacion.useMutation({
    onSuccess: async (data) => {
      await utils.operaciones.listOperaciones.invalidate();
      onCreated?.(data.id, data.codigo ?? '');
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const canNext = (() => {
    switch (step) {
      case 0:
        return draft.side !== null;
      case 1:
        return draft.comprador.asesorId.length > 0 && draft.comprador.contactoId.length > 0;
      case 2:
        return (
          draft.vendedor.propiedadType !== null &&
          draft.vendedor.propiedadId.length > 0 &&
          draft.vendedor.asesorVendedorId.length > 0 &&
          draft.vendedor.propietarioContactoId.length > 0
        );
      case 3:
        return Number(draft.estado.cierreAmount) > 0 && draft.estado.fechaCierre.length > 0;
      case 4:
        return draft.comision.declaracionJurada === true;
      case 5:
        return true;
      default:
        return false;
    }
  })();

  const handleSubmit = () => {
    if (!draft.side || !draft.vendedor.propiedadType) return;
    const payload: CreateOperacionInput = {
      countryCode: draft.countryCode,
      side: draft.side,
      comprador: {
        asesorId: draft.comprador.asesorId,
        contactoId: draft.comprador.contactoId,
      },
      vendedor: {
        propiedadType: draft.vendedor.propiedadType,
        propiedadId: draft.vendedor.propiedadId,
        asesorVendedorId: draft.vendedor.asesorVendedorId,
        ...(draft.vendedor.asesorProductorId
          ? { asesorProductorId: draft.vendedor.asesorProductorId }
          : {}),
        propietarioContactoId: draft.vendedor.propietarioContactoId,
      },
      estado: {
        status: 'propuesta',
        fechaCierre: draft.estado.fechaCierre,
        cierreAmount: Number(draft.estado.cierreAmount),
        cierreCurrency: draft.estado.cierreCurrency,
        ...(draft.estado.reservaAmount && draft.estado.reservaCurrency
          ? {
              reservaAmount: Number(draft.estado.reservaAmount),
              reservaCurrency: draft.estado.reservaCurrency,
            }
          : {}),
        ...(draft.estado.promocionAmount && draft.estado.promocionCurrency
          ? {
              promocionAmount: Number(draft.estado.promocionAmount),
              promocionCurrency: draft.estado.promocionCurrency,
            }
          : {}),
      },
      comision: {
        comisionPct: draft.comision.comisionPct,
        ivaPct: draft.comision.ivaPct,
        splitDmxPct: draft.comision.splitDmxPct,
        declaracionJurada: true,
      },
      notas: { attachmentIds: [], ...(draft.notas ? { notas: draft.notas } : {}) },
    };
    createMutation.mutate(payload);
  };

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--canon-white-pure)]">
          {t(STEP_TITLES[step] ?? STEP_TITLES[0])}
        </h2>
        <span className="text-xs uppercase tracking-wide text-[var(--canon-cream-2)]">
          {t('wizard.stepProgress', { current: (step + 1).toString(), total: '6' })}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={6}
        className="mt-3 h-1 w-full rounded-full bg-[var(--surface-recessed)]"
      >
        <div
          className="h-1 rounded-full"
          style={{
            width: `${((step + 1) / 6) * 100}%`,
            background:
              'linear-gradient(90deg, var(--canon-indigo-3), var(--canon-pink-3, #ec4899))',
          }}
        />
      </div>

      <div className="mt-5">
        {step === 0 ? (
          <SideSelector value={draft.side} onChange={(side) => setDraft({ ...draft, side })} />
        ) : null}

        {step === 1 ? (
          <div className="grid gap-3">
            <label className="text-xs text-[var(--canon-cream-2)]">
              {t('wizard.asesorIdLabel')}
              <input
                type="text"
                value={draft.comprador.asesorId}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    comprador: { ...draft.comprador, asesorId: event.target.value },
                  })
                }
                className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
              />
            </label>
            <label className="text-xs text-[var(--canon-cream-2)]">
              {t('wizard.contactoIdLabel')}
              <input
                type="text"
                value={draft.comprador.contactoId}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    comprador: { ...draft.comprador, contactoId: event.target.value },
                  })
                }
                className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
              />
            </label>
            <p className="text-xs text-[var(--canon-cream-3)]">{t('wizard.contactoHelper')}</p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-3">
            <PropiedadBrowser
              value={
                draft.vendedor.propiedadType
                  ? {
                      type: draft.vendedor.propiedadType,
                      id: draft.vendedor.propiedadId,
                    }
                  : null
              }
              onChange={(value) =>
                setDraft({
                  ...draft,
                  vendedor: {
                    ...draft.vendedor,
                    propiedadType: value.type,
                    propiedadId: value.id,
                  },
                })
              }
            />
            <PegarLigaInput />
            <label className="text-xs text-[var(--canon-cream-2)]">
              {t('wizard.asesorVendedorLabel')}
              <input
                type="text"
                value={draft.vendedor.asesorVendedorId}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    vendedor: { ...draft.vendedor, asesorVendedorId: event.target.value },
                  })
                }
                className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
              />
            </label>
            <label className="text-xs text-[var(--canon-cream-2)]">
              {t('wizard.propietarioLabel')}
              <input
                type="text"
                value={draft.vendedor.propietarioContactoId}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    vendedor: {
                      ...draft.vendedor,
                      propietarioContactoId: event.target.value,
                    },
                  })
                }
                className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3">
            <label className="text-xs text-[var(--canon-cream-2)]">
              {t('wizard.fechaCierreLabel')}
              <input
                type="date"
                value={draft.estado.fechaCierre}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    estado: { ...draft.estado, fechaCierre: event.target.value },
                  })
                }
                className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-[var(--canon-cream-2)]">
                {t('wizard.cierreAmountLabel')}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.estado.cierreAmount}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      estado: { ...draft.estado, cierreAmount: event.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
                />
              </label>
              <label className="text-xs text-[var(--canon-cream-2)]">
                {t('wizard.cierreCurrencyLabel')}
                <select
                  value={draft.estado.cierreCurrency}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      estado: {
                        ...draft.estado,
                        cierreCurrency: event.target.value as OperacionCurrency,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
                >
                  {OPERACION_CURRENCY.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <ComisionCalculator
            baseAmount={Number(draft.estado.cierreAmount) || 0}
            currency={draft.estado.cierreCurrency}
            value={draft.comision}
            onChange={(comision) => setDraft({ ...draft, comision })}
          />
        ) : null}

        {step === 5 ? (
          <label className="block text-xs text-[var(--canon-cream-2)]">
            {t('wizard.notasLabel')}
            <textarea
              rows={4}
              value={draft.notas}
              onChange={(event) => setDraft({ ...draft, notas: event.target.value })}
              className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
              maxLength={5000}
            />
          </label>
        ) : null}

        {error ? (
          <p className="mt-3 text-xs" role="alert" style={{ color: '#fca5a5' }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="md"
          type="button"
          onClick={() => {
            if (step === 0) onCancel?.();
            else setStep(step - 1);
          }}
          aria-label={step === 0 ? t('wizard.cancel') : t('wizard.back')}
        >
          {step === 0 ? t('wizard.cancel') : t('wizard.back')}
        </Button>
        {step < 5 ? (
          <Button
            variant="primary"
            size="md"
            type="button"
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            aria-label={t('wizard.next')}
          >
            {t('wizard.next')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            type="button"
            disabled={!canNext || createMutation.isPending}
            onClick={handleSubmit}
            aria-label={t('wizard.submit')}
          >
            {createMutation.isPending ? t('wizard.submitting') : t('wizard.submit')}
          </Button>
        )}
      </div>
    </Card>
  );
}

// Avoid unused-import warnings for compile-time-only zod constants
void countryCodeEnum;
