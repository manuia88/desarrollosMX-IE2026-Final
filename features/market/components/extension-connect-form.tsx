'use client';

import { useState } from 'react';

interface IssueResponse {
  api_key_id: string;
  raw_key: string;
}

export function ExtensionConnectForm() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch('/api/extension/issue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: 'Chrome Extension' }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `http_${res.status}`);
        return;
      }
      const data = (await res.json()) as IssueResponse;
      setToken(data.raw_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network_error');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('clipboard_unavailable');
    }
  }

  if (token) {
    return (
      <section className="space-y-4">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium">Token generado — visible solo una vez.</p>
          <p className="mt-1 text-muted-foreground">
            Cópialo y pégalo en la extensión DMX. Si lo pierdes, genera otro.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <code className="block break-all rounded-md bg-muted p-3 font-mono text-sm">{token}</code>
          <button
            type="button"
            onClick={() => void copy()}
            className="self-start rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            {copied ? 'Copiado ✓' : 'Copiar token'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <p>
        Genera un token de captura para autorizar tu instancia de la extensión Chrome a enviar
        listings a DMX. El token expira a los 90 días; puedes regenerarlo en cualquier momento.
      </p>
      <button
        type="button"
        onClick={() => void generate()}
        disabled={busy}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {busy ? 'Generando…' : 'Generar token'}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          Error: {error}
        </p>
      ) : null}
    </section>
  );
}
