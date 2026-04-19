'use client';

import { useState } from 'react';
import {
  ACCEPTED_MIME,
  ADMIN_UPLOAD_SOURCES,
  type AdminUploadSource,
  SOURCE_LABELS,
} from '../lib/upload-dispatch';

interface UploadResponse {
  ok: boolean;
  source: string;
  storage_path?: string;
  rows_inserted?: number;
  rows_updated?: number;
  rows_skipped?: number;
  errors?: string[];
  error?: string;
}

export function AdminIngestUploadForm() {
  const [source, setSource] = useState<AdminUploadSource>(ADMIN_UPLOAD_SOURCES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Selecciona un archivo.');
      return;
    }
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('source', source);
      form.append('file', file);
      const res = await fetch('/api/admin/ingest/upload', { method: 'POST', body: form });
      const data = (await res.json()) as UploadResponse;
      setResult(data);
      if (!res.ok || !data.ok) {
        setError(data.error ?? `http_${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network_error');
    } finally {
      setBusy(false);
    }
  }

  const accept = ACCEPTED_MIME[source].join(',');

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Fuente</span>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as AdminUploadSource)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        >
          {ADMIN_UPLOAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Archivo (max 100 MB)</span>
        <input
          type="file"
          accept={accept}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </label>

      <button
        type="submit"
        disabled={busy || !file}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {busy ? 'Procesando…' : 'Subir y procesar'}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          Error: {error}
        </p>
      ) : null}

      {result?.ok ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <p className="font-medium">Procesado correctamente.</p>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            <li>Inserted: {result.rows_inserted ?? 0}</li>
            <li>Updated: {result.rows_updated ?? 0}</li>
            <li>Skipped: {result.rows_skipped ?? 0}</li>
            {result.storage_path ? <li>Path: {result.storage_path}</li> : null}
            {result.errors?.length ? <li>Warnings: {result.errors.join('; ')}</li> : null}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
