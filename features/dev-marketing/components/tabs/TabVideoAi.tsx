'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

interface ProjectRow {
  readonly id: string;
  readonly nombre: string;
  readonly ciudad: string | null;
}

interface JobStatus {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly type: 'project' | 'prototype';
}

export function TabVideoAi() {
  const t = useTranslations('dev.marketing.videoAi');
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<readonly JobStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const projectsQ = trpc.analyticsDev.listProjects.useQuery(undefined, { retry: false });
  const projects = (projectsQ.data ?? []) as ProjectRow[];

  useEffect(() => {
    if (!proyectoId && projects.length > 0) setProyectoId(projects[0]?.id ?? null);
  }, [projects, proyectoId]);

  const request = trpc.devMarketing.requestStudioVideoJob.useMutation({
    onSuccess: (data, variables) => {
      const created: JobStatus = {
        id: data.id,
        title: data.title,
        status: data.status ?? 'queued',
        type: variables.type,
      };
      setRecentJobs((prev) => [created, ...prev].slice(0, 10));
      setError(null);
    },
    onError: (e) => setError(e.message),
  });

  const submit = (type: 'project' | 'prototype') => {
    if (!proyectoId) return;
    request.mutate({ proyectoId, type });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">{t('title')}</h2>
            <p className="text-xs text-[color:var(--color-text-secondary)]">{t('subtitle')}</p>
          </div>
          <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-violet-900">
            {t('proPlanRequired')}
          </span>
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

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => submit('project')}
            disabled={!proyectoId || request.isPending}
          >
            {t('ctaProject')}
          </Button>
          <Button
            variant="ghost-solid"
            size="md"
            onClick={() => submit('prototype')}
            disabled={!proyectoId || request.isPending}
          >
            {t('ctaPrototypes')}
          </Button>
        </div>
        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      </Card>

      <Card className="space-y-2 p-4">
        <h3 className="text-sm font-semibold">{t('queueTitle')}</h3>
        {recentJobs.length === 0 ? (
          <p className="text-xs text-[color:var(--color-text-secondary)]">{t('queueEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {recentJobs.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between rounded-md border border-[color:var(--color-border-subtle)] px-3 py-2 text-xs"
              >
                <span className="font-medium">{j.title}</span>
                <span className="rounded-full bg-[color:var(--color-surface-raised)] px-2 py-0.5 uppercase tracking-wide">
                  {j.status === 'ready'
                    ? t('statusReady')
                    : j.status === 'processing'
                      ? t('statusProcessing')
                      : t('statusQueued')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
