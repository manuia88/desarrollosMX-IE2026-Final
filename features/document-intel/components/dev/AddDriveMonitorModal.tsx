'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { parseDriveFolderId } from '@/features/document-intel/lib/drive-monitor';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

type MonitorType = 'marketing_folder' | 'legal_folder';

interface ProjectOption {
  readonly id: string;
  readonly nombre: string;
}

export interface AddDriveMonitorModalProps {
  readonly projects: readonly ProjectOption[];
  readonly onClose: () => void;
  readonly onAdded: () => void;
}

export function AddDriveMonitorModal({ projects, onClose, onAdded }: AddDriveMonitorModalProps) {
  const t = useTranslations('dev.documents.drive');
  const tCredits = useTranslations('dev.documents.credits');
  const formId = useId();

  const [url, setUrl] = useState('');
  const [type, setType] = useState<MonitorType>('marketing_folder');
  const [label, setLabel] = useState('');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const mutation = trpc.documentIntel.addDriveMonitor.useMutation({
    onSuccess: () => {
      void utils.documentIntel.listMyDriveMonitors.invalidate();
      onAdded();
    },
    onError: (e) => {
      const code = e.message;
      if (code === 'invalid_drive_folder_url') setError(t('invalid_url'));
      else if (code === 'drive_folder_not_accessible') setError(t('not_accessible'));
      else if (code === 'drive_folder_already_monitored') setError(t('duplicate'));
      else setError(code || t('not_accessible'));
    },
  });

  const folderIdValid = useMemo(() => parseDriveFolderId(url) !== null, [url]);
  const submitDisabled = !folderIdValid || mutation.isPending;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!folderIdValid) {
      setError(t('invalid_url'));
      return;
    }
    mutation.mutate({
      drive_folder_url: url,
      monitor_type: type,
      ...(projectId ? { proyecto_id: projectId } : {}),
      ...(label.trim() ? { folder_label: label.trim() } : {}),
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-6"
        style={{
          background: 'var(--canon-bg-elevated, #14171f)',
          borderColor: 'rgba(255,255,255,0.10)',
          color: 'var(--canon-cream)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        <h2
          id={`${formId}-title`}
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('add_modal_title')}
        </h2>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field
            id={`${formId}-url`}
            label={t('url_label')}
            invalid={url.length > 0 && !folderIdValid}
            errorText={url.length > 0 && !folderIdValid ? t('invalid_url') : null}
          >
            <input
              id={`${formId}-url`}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('paste_link')}
              required
              className="h-10 w-full rounded-lg px-3 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'var(--canon-cream)',
              }}
            />
          </Field>

          <Field id={`${formId}-type`} label={t('type_label')}>
            <select
              id={`${formId}-type`}
              value={type}
              onChange={(e) => setType(e.target.value as MonitorType)}
              className="h-10 w-full rounded-lg px-3 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'var(--canon-cream)',
              }}
            >
              <option value="marketing_folder">{t('type_marketing')}</option>
              <option value="legal_folder">{t('type_legal')}</option>
            </select>
          </Field>

          <Field id={`${formId}-label`} label={t('label_label')}>
            <input
              id={`${formId}-label`}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('label_placeholder')}
              maxLength={120}
              className="h-10 w-full rounded-lg px-3 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'var(--canon-cream)',
              }}
            />
          </Field>

          {projects.length > 0 ? (
            <Field id={`${formId}-project`} label={t('project_label')}>
              <select
                id={`${formId}-project`}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 w-full rounded-lg px-3 text-sm"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'var(--canon-cream)',
                }}
              >
                <option value="">{t('project_placeholder')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {error ? (
            <p role="alert" className="text-xs" style={{ color: 'rgb(252, 165, 165)' }}>
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[34px] rounded-full px-4 text-xs"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'var(--canon-cream)',
              }}
            >
              {tCredits('close')}
            </button>
            <Button type="submit" variant="primary" size="sm" disabled={submitDisabled}>
              {mutation.isPending ? t('submit_loading') : t('submit_button')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly invalid?: boolean;
  readonly errorText?: string | null;
  readonly children: React.ReactNode;
}

function Field({ id, label, invalid, errorText, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--canon-cream-3)' }}
      >
        {label}
      </label>
      {children}
      {invalid && errorText ? (
        <p className="text-[11px]" role="alert" style={{ color: 'rgb(252, 165, 165)' }}>
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
