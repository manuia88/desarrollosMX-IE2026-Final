'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { PropiedadType } from '@/features/operaciones/schemas';
import { Card } from '@/shared/ui/primitives/canon';

const TYPES: ReadonlyArray<PropiedadType> = ['proyecto', 'unidad', 'propiedad_secundaria'];

export interface PropiedadBrowserProps {
  value: { type: PropiedadType; id: string } | null;
  onChange: (value: { type: PropiedadType; id: string }) => void;
}

export function PropiedadBrowser({ value, onChange }: PropiedadBrowserProps) {
  const t = useTranslations('Operaciones');
  const [type, setType] = useState<PropiedadType>(value?.type ?? 'unidad');
  const [idInput, setIdInput] = useState(value?.id ?? '');

  const handleApply = () => {
    if (idInput.length >= 8) {
      onChange({ type, id: idInput });
    }
  };

  return (
    <Card variant="recessed" className="p-4">
      <p className="text-sm font-semibold text-[var(--canon-white-pure)]">{t('propiedad.title')}</p>
      <p className="mt-1 text-xs text-[var(--canon-cream-2)]">{t('propiedad.helper')}</p>
      <fieldset className="mt-3 flex flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">{t('propiedad.typeLabel')}</legend>
        {TYPES.map((option) => {
          const active = option === type;
          return (
            <label
              key={option}
              className="cursor-pointer rounded-full border px-3 py-1.5 text-xs"
              style={{
                background: active ? 'var(--canon-indigo-3)' : 'var(--surface-elevated)',
                color: active ? 'var(--canon-bg)' : 'var(--canon-white-pure)',
                borderColor: active ? 'var(--canon-indigo-3)' : 'var(--canon-border)',
              }}
            >
              <input
                type="radio"
                name="propiedad-type"
                value={option}
                checked={active}
                onChange={() => setType(option)}
                className="sr-only"
              />
              {t(`propiedad.types.${option}`)}
            </label>
          );
        })}
      </fieldset>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={idInput}
          onChange={(event) => setIdInput(event.target.value)}
          onBlur={handleApply}
          placeholder={t('propiedad.idPlaceholder')}
          className="flex-1 min-w-[16rem] rounded-full border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm text-[var(--canon-white-pure)] focus:outline-none focus:ring-2 focus:ring-[var(--canon-indigo-3)]"
          aria-label={t('propiedad.idLabel')}
        />
      </div>
      {value ? (
        <p className="mt-2 text-xs text-[var(--canon-cream-2)]">
          {t('propiedad.selected', { type: t(`propiedad.types.${value.type}`) })}
        </p>
      ) : null}
    </Card>
  );
}
