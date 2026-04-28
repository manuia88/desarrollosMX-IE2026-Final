'use client';

// F14.F.10 Sprint 9 BIBLIA SUB-AGENT 3 — Bulk video creator (2-20 propiedades).
// Drag&drop carpetas, pre-fill property data desde folder name + photo metadata.
// Submit dispara trpc.studio.sprint9Photographer.createBulkBatch + progress tracker
// real-time poll cada 5s vía getBatchStatus. ADR-050 canon: pill buttons, brand
// gradient progress bar, glass surfaces, translateY only.
//
// i18n migration agendada L-NEW-PHOTOGRAPHER-I18N-KEYS H2 (R8 Sub-agent 3 prohibe
// tocar messages/*.json; copy literal forwards-compatible).

import { useCallback, useId, useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

const MIN_PROPERTIES = 2;
const MAX_PROPERTIES = 20;
const POLLING_INTERVAL_MS = 5000;

const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['completed', 'failed', 'cancelled']);

interface PendingProperty {
  readonly localId: string;
  readonly folderName: string;
  readonly propertyTitle: string;
  readonly photoCount: number;
}

export interface BulkVideoCreatorProps {
  readonly disabled?: boolean;
  readonly onBatchCreated?: (batchId: string) => void;
}

function makeLocalId(): string {
  return `local-${Math.random().toString(36).slice(2, 10)}`;
}

function deriveTitle(folderName: string): string {
  return folderName
    .replace(/[_-]+/g, ' ')
    .replace(/\.[^.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function buildLabel(count: number): string {
  if (count < MIN_PROPERTIES) {
    return `Mínimo ${MIN_PROPERTIES} propiedades`;
  }
  if (count > MAX_PROPERTIES) {
    return `Máximo ${MAX_PROPERTIES} propiedades`;
  }
  return `${count} propiedades listas`;
}

export function BulkVideoCreator({ disabled, onBatchCreated }: BulkVideoCreatorProps) {
  const dropzoneId = useId();
  const [pending, setPending] = useState<ReadonlyArray<PendingProperty>>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const createBatch = trpc.studio.sprint9Photographer.createBulkBatch.useMutation();

  const batchStatusQuery = trpc.studio.sprint9Photographer.getBatchStatus.useQuery(
    { batchId: activeBatchId ?? '' },
    {
      enabled: Boolean(activeBatchId),
      refetchInterval: POLLING_INTERVAL_MS,
      refetchIntervalInBackground: false,
    },
  );

  const queryData = batchStatusQuery.data as
    | {
        jobs: ReadonlyArray<{ status: string }>;
        counts: Record<string, number>;
      }
    | undefined;
  const counts = queryData?.counts ?? {};
  const total = queryData?.jobs.length ?? 0;
  const completed = counts.completed ?? 0;
  const failed = counts.failed ?? 0;
  const inProgress = total - completed - failed;
  const progressPct = total === 0 ? 0 : Math.round(((completed + failed) / total) * 100);
  const allTerminal =
    total > 0 && (queryData?.jobs ?? []).every((j) => TERMINAL_STATUSES.has(j.status));
  // Polling cap H2: defer perfect cancel a L-NEW-PHOTOGRAPHER-BULK-POLL-OPTIMIZE.
  // Por ahora React Query continúa polling al intervalo configurado; allTerminal
  // marca UI como done sin bloquear el background fetch.
  void allTerminal;

  const ingestFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const folderMap = new Map<string, { folder: string; count: number }>();
    Array.from(fileList).forEach((file) => {
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name;
      const parts = path.split('/').filter(Boolean);
      const folder = parts.length > 1 ? (parts[0] ?? 'sin-carpeta') : 'sin-carpeta';
      const entry = folderMap.get(folder) ?? { folder, count: 0 };
      entry.count += 1;
      folderMap.set(folder, entry);
    });
    setPending((current) => {
      const existing = new Set(current.map((p) => p.folderName));
      const added: PendingProperty[] = [];
      folderMap.forEach((value) => {
        if (existing.has(value.folder)) return;
        added.push({
          localId: makeLocalId(),
          folderName: value.folder,
          propertyTitle: deriveTitle(value.folder),
          photoCount: value.count,
        });
      });
      const next = [...current, ...added];
      if (next.length > MAX_PROPERTIES) return next.slice(0, MAX_PROPERTIES);
      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      ingestFiles(event.dataTransfer.files);
    },
    [ingestFiles],
  );

  const handleRemove = useCallback((localId: string) => {
    setPending((current) => current.filter((p) => p.localId !== localId));
  }, []);

  const updateTitle = useCallback((localId: string, title: string) => {
    setPending((current) =>
      current.map((p) => (p.localId === localId ? { ...p, propertyTitle: title } : p)),
    );
  }, []);

  const canSubmit = useMemo(
    () =>
      !disabled &&
      !createBatch.isPending &&
      pending.length >= MIN_PROPERTIES &&
      pending.length <= MAX_PROPERTIES &&
      !activeBatchId,
    [disabled, createBatch.isPending, pending.length, activeBatchId],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      // STUB ADR-018 — projectIds debería resolver desde archivos uploaded:
      // L-NEW-PHOTOGRAPHER-BULK-UPLOAD-RESOLVER (validar permisos + crear
      // studio_video_projects per carpeta). H1 envía localId hash como UUID
      // placeholder hasta worker real online.
      const placeholderProjectIds = pending.map(() => crypto.randomUUID());
      try {
        const result = await createBatch.mutateAsync({ projectIds: placeholderProjectIds });
        setActiveBatchId(result.batchId);
        if (onBatchCreated) onBatchCreated(result.batchId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        setError(message);
      }
    },
    [createBatch, onBatchCreated, pending],
  );

  const handleReset = useCallback(() => {
    setPending([]);
    setActiveBatchId(null);
    setError(null);
  }, []);

  return (
    <Card
      variant="elevated"
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h2
          className="font-[var(--font-display)] text-2xl font-extrabold tracking-tight"
          style={{ color: 'var(--canon-cream)', margin: 0 }}
        >
          Generación masiva de videos
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--canon-cream-2)',
            lineHeight: 1.55,
          }}
        >
          Arrastra hasta {MAX_PROPERTIES} carpetas. Una carpeta = una propiedad. Mínimo{' '}
          {MIN_PROPERTIES}.
        </p>
      </header>

      {!activeBatchId ? (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <section
            id={dropzoneId}
            aria-label="Zona de soltar carpetas de propiedades"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? '#A5B4FC' : 'var(--canon-border)'}`,
              borderRadius: 'var(--canon-radius-card)',
              padding: '32px 20px',
              textAlign: 'center',
              background: isDragging ? 'rgba(99,102,241,0.08)' : 'var(--surface-recessed)',
              transition: 'background 200ms, border-color 200ms',
            }}
          >
            <p style={{ margin: '0 0 8px', color: 'var(--canon-cream)', fontWeight: 600 }}>
              Suelta tus carpetas aquí
            </p>
            <p style={{ margin: 0, color: 'var(--canon-cream-2)', fontSize: '13px' }}>
              También puedes seleccionar usando el botón inferior.
            </p>
            <input
              type="file"
              multiple
              {...({ webkitdirectory: 'true' } as Record<string, string>)}
              onChange={(e) => ingestFiles(e.target.files)}
              style={{ display: 'block', margin: '14px auto 0', color: 'var(--canon-cream-2)' }}
              aria-label="Selecciona carpetas de propiedades"
              disabled={disabled}
            />
          </section>

          {pending.length > 0 ? (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {pending.map((p) => (
                <li
                  key={p.localId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: 'var(--surface-recessed)',
                    border: '1px solid var(--canon-border)',
                    borderRadius: 'var(--canon-radius-chip)',
                  }}
                >
                  <input
                    type="text"
                    value={p.propertyTitle}
                    onChange={(e) => updateTitle(p.localId, e.target.value)}
                    aria-label={`Título de propiedad ${p.folderName}`}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--canon-cream)',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                  <span style={{ color: 'var(--canon-cream-2)', fontSize: '12px' }}>
                    {p.photoCount} fotos
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(p.localId)}
                    aria-label={`Quitar propiedad ${p.propertyTitle}`}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--canon-border-2)',
                      color: 'var(--canon-cream-2)',
                      borderRadius: 'var(--canon-radius-pill)',
                      padding: '4px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ color: 'var(--canon-cream-2)', fontSize: '13px' }}>
              {buildLabel(pending.length)}
            </span>
            <Button type="submit" variant="primary" size="md" disabled={!canSubmit}>
              {createBatch.isPending ? 'Enviando…' : 'Generar batch'}
            </Button>
          </div>

          {error ? (
            <div
              role="alert"
              style={{
                padding: '12px 14px',
                background: 'rgba(244,63,94,0.10)',
                border: '1px solid rgba(244,63,94,0.30)',
                borderRadius: 'var(--canon-radius-card)',
                color: '#FCA5A5',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          ) : null}
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: 'var(--canon-cream)', fontWeight: 600 }}>Batch en proceso</span>
              <span style={{ color: 'var(--canon-cream-2)', fontSize: '13px' }}>
                {progressPct}% — {completed}/{total} listos
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                width: '100%',
                height: '8px',
                background: 'var(--surface-recessed)',
                borderRadius: 'var(--canon-radius-pill)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg,#6366F1,#EC4899)',
                  transition: 'width 320ms ease-out',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                fontSize: '12px',
                color: 'var(--canon-cream-2)',
              }}
            >
              <span>En progreso: {inProgress}</span>
              <span>Completados: {completed}</span>
              <span>Fallidos: {failed}</span>
            </div>
          </div>

          <Button type="button" variant="ghost" size="md" onClick={handleReset}>
            Crear nuevo batch
          </Button>
        </div>
      )}
    </Card>
  );
}
