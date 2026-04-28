'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

interface ProjectRow {
  readonly id: string;
  readonly nombre: string;
  readonly ciudad: string | null;
  readonly colonia: string | null;
}

export function TabKit() {
  const t = useTranslations('dev.marketing.kit');
  const projectsQ = trpc.analyticsDev.listProjects.useQuery(undefined, { retry: false });
  const projects = (projectsQ.data ?? []) as ProjectRow[];
  const [proyectoId, setProyectoId] = useState<string | null>(null);

  useEffect(() => {
    if (!proyectoId && projects.length > 0) setProyectoId(projects[0]?.id ?? null);
  }, [projects, proyectoId]);

  return (
    <Card className="space-y-3 p-4">
      <header>
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <p className="text-xs text-[color:var(--color-text-secondary)]">{t('subtitle')}</p>
      </header>

      <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
        <span className="text-[color:var(--color-text-secondary)]">{t('selectProject')}</span>
        <select
          value={proyectoId ?? ''}
          onChange={(e) => setProyectoId(e.target.value || null)}
          className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-3 py-1.5 text-sm"
        >
          <option value="">{t('selectPlaceholder')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <KitFeature label={t('feature.iescore')} />
        <KitFeature label={t('feature.zoneScores')} />
        <KitFeature label={t('feature.absorption')} />
        <KitFeature label={t('feature.financialModel')} />
        <KitFeature label={t('feature.walkability')} />
        <KitFeature label={t('feature.photos')} />
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" disabled>
          {t('ctaPdf')}
        </Button>
        <Button variant="ghost-solid" size="sm" disabled>
          {t('ctaPptx')}
        </Button>
        <Button variant="ghost-solid" size="sm" disabled>
          {t('ctaWeb')}
        </Button>
      </div>
      <p className="rounded-md border border-violet-200 bg-violet-50 p-2 text-[11px] text-violet-900">
        {t('stubNote')}
      </p>
    </Card>
  );
}

function KitFeature({ label }: { readonly label: string }) {
  return (
    <li className="rounded-md border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-3 py-2 text-xs text-[color:var(--color-text-secondary)]">
      {label}
    </li>
  );
}
