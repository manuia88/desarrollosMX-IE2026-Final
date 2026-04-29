'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { AddDriveMonitorModal } from '@/features/document-intel/components/dev/AddDriveMonitorModal';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

interface ProjectOption {
  readonly id: string;
  readonly nombre: string;
}

export interface DriveMonitorSettingsProps {
  readonly projects: readonly ProjectOption[];
}

export function DriveMonitorSettings({ projects }: DriveMonitorSettingsProps) {
  const t = useTranslations('dev.documents.drive');
  const format = useFormatter();
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.documentIntel.listMyDriveMonitors.useQuery(undefined, {
    staleTime: 15_000,
  });

  const deleteMutation = trpc.documentIntel.deleteDriveMonitor.useMutation({
    onSuccess: () => {
      void utils.documentIntel.listMyDriveMonitors.invalidate();
      setFeedback({ kind: 'ok', msg: t('deleted_success') });
    },
    onError: (e) => setFeedback({ kind: 'err', msg: e.message }),
  });

  function handleDelete(id: string) {
    if (!window.confirm(t('delete_confirm'))) return;
    deleteMutation.mutate({ id });
  }

  const monitors = listQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--canon-cream)' }}
          >
            {t('page_title')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--canon-cream-3)' }}>
            {t('page_subtitle')}
          </p>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          + {t('add_button')}
        </Button>
      </header>

      {feedback ? (
        <p
          role="status"
          className="text-xs"
          style={{
            color: feedback.kind === 'ok' ? 'rgb(134, 239, 172)' : 'rgb(252, 165, 165)',
          }}
        >
          {feedback.msg}
        </p>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-sm" style={{ color: 'var(--canon-cream-3)' }}>
          {t('last_polled')}…
        </p>
      ) : monitors.length === 0 ? (
        <Card variant="recessed" className="p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--canon-cream-3)' }}>
            {t('empty_state')}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {monitors.map((m) => (
            <li key={m.id}>
              <Card variant="elevated" className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-base font-semibold"
                        style={{ color: 'var(--canon-cream)' }}
                      >
                        {m.folder_label ?? m.drive_folder_id}
                      </span>
                      <TypeBadge type={m.monitor_type} />
                    </div>
                    <a
                      href={m.drive_folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline"
                      style={{ color: 'var(--canon-indigo-2)' }}
                    >
                      {m.drive_folder_url}
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(m.id)}
                  >
                    {t('delete_button')}
                  </Button>
                </div>

                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Stat
                    label={t('last_polled')}
                    value={
                      m.last_polled_at
                        ? format.relativeTime(new Date(m.last_polled_at))
                        : t('never_polled')
                    }
                  />
                  <Stat
                    label={t('files_detected')}
                    value={String(m.last_polled_files_count ?? 0)}
                  />
                  <Stat
                    label={t('next_poll')}
                    value={m.next_poll_at ? format.relativeTime(new Date(m.next_poll_at)) : '—'}
                  />
                </dl>

                {m.failure_count > 0 && m.last_failure_message ? (
                  <p role="alert" className="text-xs" style={{ color: 'rgb(252, 211, 77)' }}>
                    {t('failure_warning', { message: m.last_failure_message })}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {modalOpen ? (
        <AddDriveMonitorModal
          projects={projects}
          onClose={() => setModalOpen(false)}
          onAdded={() => {
            setModalOpen(false);
            setFeedback({ kind: 'ok', msg: t('added_success') });
          }}
        />
      ) : null}
    </div>
  );
}

function TypeBadge({ type }: { readonly type: string }) {
  const t = useTranslations('dev.documents.drive');
  const isMarketing = type === 'marketing_folder';
  return (
    <span
      className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={
        isMarketing
          ? {
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.40)',
              color: 'rgb(165, 180, 252)',
            }
          : {
              background: 'rgba(236, 72, 153, 0.15)',
              border: '1px solid rgba(236, 72, 153, 0.40)',
              color: 'rgb(251, 207, 232)',
            }
      }
    >
      {isMarketing ? t('type_marketing') : t('type_legal')}
    </span>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--canon-cream-3)' }}
      >
        {label}
      </dt>
      <dd
        className="text-sm font-semibold"
        style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </dd>
    </div>
  );
}
