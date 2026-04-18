'use client';

import { useState } from 'react';

export function SignOutAllButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/sign-out-all', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'sign_out_failed');
        return;
      }
      window.location.href = '/auth/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'sign_out_failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Cerrando sesiones…' : 'Cerrar todas las sesiones'}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
