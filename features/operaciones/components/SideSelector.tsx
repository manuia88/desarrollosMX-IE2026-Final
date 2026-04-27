'use client';

import { useTranslations } from 'next-intl';
import type { OperacionSide } from '@/features/operaciones/schemas';
import { Card } from '@/shared/ui/primitives/canon';

const SIDES: ReadonlyArray<OperacionSide> = ['ambos', 'comprador', 'vendedor'];

export interface SideSelectorProps {
  value: OperacionSide | null;
  onChange: (side: OperacionSide) => void;
}

export function SideSelector({ value, onChange }: SideSelectorProps) {
  const t = useTranslations('Operaciones');
  return (
    <fieldset className="grid gap-3 md:grid-cols-3 border-0 p-0">
      <legend className="sr-only">{t('side.label')}</legend>
      {SIDES.map((side) => {
        const isActive = value === side;
        return (
          <label key={side} className="block cursor-pointer text-left">
            <input
              type="radio"
              name="operacion-side"
              value={side}
              checked={isActive}
              onChange={() => onChange(side)}
              className="sr-only"
            />
            <Card
              variant={isActive ? 'elevated' : 'recessed'}
              className="p-4 transition-transform hover:-translate-y-1"
              style={{
                borderColor: isActive ? 'var(--canon-indigo-3)' : 'var(--canon-card-border)',
              }}
            >
              <div className="text-sm font-bold uppercase tracking-wide text-[var(--canon-white-pure)]">
                {t(`side.${side}.label`)}
              </div>
              <p className="mt-2 text-xs text-[var(--canon-cream-2)]">
                {t(`side.${side}.description`)}
              </p>
            </Card>
          </label>
        );
      })}
    </fieldset>
  );
}
