'use client';

import { useState } from 'react';
import {
  MARKET_ACCEPTED_MIME,
  MARKET_SOURCE_LABELS,
  MARKET_UPLOAD_SOURCES,
  type MarketUploadSource,
} from '../lib/market-upload-dispatch';

interface UploadResponse {
  ok: boolean;
  source: string;
  storage_path?: string;
  rows_inserted?: number;
  rows_updated?: number;
  rows_skipped?: number;
  report_period?: string;
  review_required?: boolean;
  errors?: string[];
  error?: string;
}

export function MarketIngestUploadForm() {
  const [source, setSource] = useState<MarketUploadSource>(MARKET_UPLOAD_SOURCES[0]);
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
      const res = await fetch('/api/admin/ingest/market/upload', {
        method: 'POST',
        body: form,
      });
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

  const accept = MARKET_ACCEPTED_MIME[source].join(',');

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Publisher</span>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as MarketUploadSource)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        >
          {MARKET_UPLOAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {MARKET_SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Archivo PDF (max 100 MB)</span>
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
        {busy ? 'Extrayendo con GPT-4o-mini…' : 'Subir y extraer'}
      </button>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          Error: {error}
        </p>
      ) : null}

      {result?.ok ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <p className="font-medium">Extracción completada.</p>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            <li>Rows inserted: {result.rows_inserted ?? 0}</li>
            <li>Rows updated: {result.rows_updated ?? 0}</li>
            <li>Rows skipped: {result.rows_skipped ?? 0}</li>
            {result.report_period ? <li>Período: {result.report_period}</li> : null}
            {result.storage_path ? <li>Path: {result.storage_path}</li> : null}
            {result.review_required ? (
              <li className="text-amber-300">
                ⚠ Review manual requerido (confidence &lt; 0.8). Revisar antes de usar en downstream
                scores.
              </li>
            ) : null}
            {result.errors?.length ? <li>Warnings: {result.errors.join('; ')}</li> : null}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
