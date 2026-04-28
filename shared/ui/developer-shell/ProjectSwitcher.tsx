'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo } from 'react';
import { useDeveloperStore } from '@/features/developer/hooks/use-developer-store';
import { trpc } from '@/shared/lib/trpc/client';

export function ProjectSwitcher() {
  const t = useTranslations('dev.layout.projectSwitcher');
  const id = useId();
  const currentProjectId = useDeveloperStore((s) => s.currentProjectId);
  const setCurrentProjectId = useDeveloperStore((s) => s.setCurrentProjectId);

  const { data, isLoading } = trpc.developer.listMyProjects.useQuery(undefined, {
    staleTime: 60_000,
  });

  type ProjectRow = {
    id: string;
    nombre: string;
    status: string;
    units_total: number | null;
    units_available: number | null;
  };
  const projects = useMemo<readonly ProjectRow[]>(() => (data as ProjectRow[]) ?? [], [data]);

  useEffect(() => {
    if (currentProjectId === null && projects.length > 0) {
      const first = projects[0];
      if (first) setCurrentProjectId(first.id);
    }
    if (
      currentProjectId !== null &&
      projects.length > 0 &&
      !projects.some((p) => p.id === currentProjectId)
    ) {
      const first = projects[0];
      setCurrentProjectId(first ? first.id : null);
    }
  }, [projects, currentProjectId, setCurrentProjectId]);

  if (isLoading) {
    return (
      <div
        className="flex h-9 items-center gap-2 rounded-full px-3 text-xs"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--canon-cream-3)',
        }}
        aria-busy="true"
      >
        {t('label')}…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <span
        className="flex h-9 items-center rounded-full px-3 text-xs"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--canon-cream-3)',
        }}
      >
        {t('noProjects')}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--canon-cream-3)' }}
      >
        {t('label')}
      </label>
      <select
        id={id}
        value={currentProjectId ?? ''}
        onChange={(e) => setCurrentProjectId(e.target.value || null)}
        className="h-9 rounded-full px-3 text-xs"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--canon-cream)',
        }}
        aria-label={t('label')}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
