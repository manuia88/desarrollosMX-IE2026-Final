'use client';

import { useState } from 'react';

export function BackupCodesPanel() {
  const [pending, setPending] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    if (!window.confirm('Esto invalidará tus códigos de respaldo actuales. ¿Continuar?')) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/backup-codes/regenerate', {
        method: 'POST',
        credentials: 'include',
      });
      const body = (await res.json()) as { codes?: string[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? 'regenerate_failed');
        return;
      }
      setCodes(body.codes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'regenerate_failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={pending}
        className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Generando…' : 'Regenerar códigos de respaldo'}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {codes ? (
        <div className="rounded-md border bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium">
            Guarda estos códigos en un lugar seguro. No los volverás a ver.
          </p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((code) => (
              <li key={code} className="rounded bg-white px-2 py-1 text-center">
                {code}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
