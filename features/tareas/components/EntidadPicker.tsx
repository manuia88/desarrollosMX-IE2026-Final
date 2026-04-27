'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import type { TareaType } from '@/features/tareas/schemas';
import { trpc } from '@/shared/lib/trpc/client';

export interface EntidadPickerProps {
  type: Exclude<TareaType, 'general'>;
  value: string | undefined;
  onChange: (entityId: string, label: string) => void;
}

interface PickerOption {
  id: string;
  label: string;
  meta: string;
}

const inputStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  padding: '8px 14px',
  width: '100%',
};

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

function useEntityOptions(
  type: Exclude<TareaType, 'general'>,
  query: string,
): { options: PickerOption[]; isLoading: boolean; isError: boolean } {
  const debouncedQuery = useDebounced(query, 300);
  const enabled = debouncedQuery.length === 0 || debouncedQuery.length >= 2;

  const captacionesQuery = trpc.captaciones.list.useQuery(
    { limit: 20 },
    { enabled: enabled && (type === 'property' || type === 'capture') },
  );

  const captacionesOptions = useMemo<PickerOption[]>(() => {
    if (type !== 'property' && type !== 'capture') return [];
    const items = (captacionesQuery.data?.items ?? []) as Array<{
      id: string;
      propietario_nombre: string;
      direccion: string | null;
      colonia: string | null;
    }>;
    const queryLower = debouncedQuery.toLowerCase();
    return items
      .filter((row) =>
        queryLower
          ? `${row.propietario_nombre} ${row.direccion ?? ''}`.toLowerCase().includes(queryLower)
          : true,
      )
      .map((row) => ({
        id: row.id,
        label: row.propietario_nombre,
        meta: row.direccion ?? row.colonia ?? '—',
      }));
  }, [captacionesQuery.data, type, debouncedQuery]);

  if (type === 'property' || type === 'capture') {
    return {
      options: captacionesOptions,
      isLoading: captacionesQuery.isLoading,
      isError: captacionesQuery.isError,
    };
  }
  return { options: [], isLoading: false, isError: false };
}

export function EntidadPicker({ type, value, onChange }: EntidadPickerProps) {
  const t = useTranslations('Tareas');
  const [query, setQuery] = useState('');
  const { options, isLoading, isError } = useEntityOptions(type, query);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        placeholder={t(`entityPicker.placeholder.${type}`)}
        aria-label={t('entityPicker.aria')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        style={inputStyle}
      />
      <div
        role="listbox"
        aria-label={t('entityPicker.listAria')}
        className="flex max-h-56 flex-col gap-1 overflow-y-auto"
      >
        {isLoading ? (
          <p style={{ color: 'var(--canon-cream-2)', fontSize: 12.5 }}>
            {t('entityPicker.loading')}
          </p>
        ) : isError ? (
          <p style={{ color: '#fca5a5', fontSize: 12.5 }}>{t('entityPicker.error')}</p>
        ) : options.length === 0 ? (
          <p style={{ color: 'var(--canon-cream-2)', fontSize: 12.5 }}>{t('entityPicker.empty')}</p>
        ) : (
          options.map((option) => {
            const active = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onChange(option.id, option.label)}
                style={{
                  background: active ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.10)'}`,
                  borderRadius: 'var(--canon-radius-card)',
                  color: 'var(--canon-cream)',
                  fontFamily: 'var(--font-body)',
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    color: 'var(--canon-white-pure)',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'block',
                  }}
                >
                  {option.label}
                </span>
                <span
                  style={{
                    color: 'var(--canon-cream-2)',
                    fontSize: 11.5,
                    display: 'block',
                  }}
                >
                  {option.meta}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
