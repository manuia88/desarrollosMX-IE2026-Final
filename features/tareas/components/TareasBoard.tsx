'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import { type TareaScope, tareaScopeEnum } from '@/features/tareas/schemas';
import type { GroupedTareasKey, TareaCardData } from '@/features/tareas/types';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon/button';
import { Card } from '@/shared/ui/primitives/canon/card';
import { DisclosurePill } from '@/shared/ui/primitives/canon/disclosure-pill';
import { EquipoToggle } from './EquipoToggle';
import { NuevaTareaWizard } from './NuevaTareaWizard';
import { TareaCard } from './TareaCard';

const COLUMNS: readonly GroupedTareasKey[] = ['propiedades', 'clientes', 'prospectos'];
const SCOPES: readonly TareaScope[] = tareaScopeEnum.options;

export interface TareasBoardProps {
  canViewTeam: boolean;
}

const headingStyle: CSSProperties = {
  color: 'var(--canon-white-pure)',
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 24,
  lineHeight: 1.1,
};

const columnHeadingStyle: CSSProperties = {
  color: 'var(--canon-white-pure)',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 14,
  textTransform: 'uppercase',
  letterSpacing: '0.10em',
};

export function TareasBoard({ canViewTeam }: TareasBoardProps) {
  const t = useTranslations('Tareas');
  const [scope, setScope] = useState<TareaScope>('today');
  const [teamView, setTeamView] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const utils = trpc.useUtils();
  const listQuery = trpc.tareas.listTareas.useQuery({
    scope,
    teamView,
    limit: 200,
  });
  const completeMutation = trpc.tareas.completeTarea.useMutation({
    onSuccess: async () => {
      await utils.tareas.listTareas.invalidate();
    },
  });

  const handleComplete = (id: string) => {
    completeMutation.mutate({ id });
  };

  const grouped = listQuery.data;
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;

  const allEmpty =
    grouped !== undefined &&
    grouped.propiedades.length === 0 &&
    grouped.clientes.length === 0 &&
    grouped.prospectos.length === 0 &&
    grouped.general.length === 0;

  return (
    <div
      className="flex flex-col gap-6 px-4 py-6 md:px-6"
      style={{ background: 'var(--canon-bg)' }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 style={headingStyle}>{t('header.title')}</h1>
          <DisclosurePill tone="violet">{t('header.disclosure')}</DisclosurePill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EquipoToggle enabled={teamView} onChange={setTeamView} visible={canViewTeam} />
          <Button
            variant="primary"
            size="md"
            onClick={() => setWizardOpen(true)}
            aria-label={t('header.create')}
          >
            {t('header.create')}
          </Button>
        </div>
      </header>

      <div role="tablist" aria-label={t('filters.aria')} className="flex flex-wrap gap-2">
        {SCOPES.map((value) => {
          const active = scope === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setScope(value)}
              style={{
                background: active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 'var(--canon-radius-pill)',
                color: active ? '#c7d2fe' : 'var(--canon-cream)',
                fontFamily: 'var(--font-body)',
                fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                padding: '6px 14px',
              }}
            >
              {t(`filters.${value}`)}
            </button>
          );
        })}
      </div>

      {isError ? (
        <Card variant="default" className="p-6" role="alert">
          <p style={{ color: '#fca5a5', fontFamily: 'var(--font-body)' }}>{t('errors.list')}</p>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col} className="flex flex-col gap-3">
              <span style={columnHeadingStyle}>{t(`column.${col}`)}</span>
              {[0, 1, 2].map((index) => (
                <Card key={index} variant="default" className="h-24 p-4" aria-busy="true">
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 'var(--canon-radius-card)',
                      height: 12,
                      width: '60%',
                    }}
                  />
                </Card>
              ))}
            </div>
          ))}
        </div>
      ) : allEmpty ? (
        <Card variant="recessed" className="flex flex-col items-center gap-3 p-8 text-center">
          <p
            style={{
              color: 'var(--canon-white-pure)',
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {t('empty.title')}
          </p>
          <p style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}>
            {t('empty.body')}
          </p>
          <Button variant="primary" size="md" onClick={() => setWizardOpen(true)}>
            {t('empty.cta')}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items: TareaCardData[] = grouped ? grouped[col] : [];
            const generalForCol = grouped?.general ?? [];
            const merged = [...items, ...generalForCol];
            return (
              <div key={col} className="flex flex-col gap-3">
                <span style={columnHeadingStyle}>{t(`column.${col}`)}</span>
                {merged.length === 0 ? (
                  <Card variant="default" className="p-4" aria-label={t('column.empty')}>
                    <p style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}>
                      {t('column.empty')}
                    </p>
                  </Card>
                ) : (
                  merged.map((tarea) => (
                    <TareaCard
                      key={tarea.id}
                      tarea={tarea}
                      onComplete={handleComplete}
                      isCompleting={completeMutation.isPending}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      <NuevaTareaWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
