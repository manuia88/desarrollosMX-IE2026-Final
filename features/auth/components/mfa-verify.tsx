'use client';

import { useState } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { trpc } from '@/shared/lib/trpc/client';

type Mode = 'totp' | 'backup';

export function MfaVerify({ factorId }: { factorId: string }) {
  const [mode, setMode] = useState<Mode>('totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const consumeBackup = trpc.mfa.consumeBackupCode.useMutation();

  async function verifyTotp() {
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      window.location.href = '/';
    } finally {
      setPending(false);
    }
  }

  async function verifyBackup() {
    setError(null);
    setPending(true);
    try {
      await consumeBackup.mutateAsync({ code });
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'backup_invalid');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Verifica tu identidad</h1>
      <p className="text-sm opacity-80">
        {mode === 'totp'
          ? 'Ingresa el código de 6 dígitos de tu app de autenticación.'
          : 'Ingresa uno de tus códigos de respaldo (8 caracteres).'}
      </p>
      <input
        className="w-full rounded border px-3 py-2 text-center text-xl tracking-widest"
        inputMode={mode === 'totp' ? 'numeric' : 'text'}
        maxLength={mode === 'totp' ? 6 : 8}
        placeholder={mode === 'totp' ? '000000' : 'XXXXXXXX'}
        value={code}
        onChange={(e) =>
          setCode(
            mode === 'totp'
              ? e.target.value.replace(/\D/g, '')
              : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
          )
        }
      />
      <button
        type="button"
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        disabled={pending || (mode === 'totp' ? code.length !== 6 : code.length !== 8)}
        onClick={mode === 'totp' ? verifyTotp : verifyBackup}
      >
        {pending ? 'Verificando…' : 'Verificar'}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        className="block w-full text-center text-sm underline"
        onClick={() => {
          setMode(mode === 'totp' ? 'backup' : 'totp');
          setCode('');
          setError(null);
        }}
      >
        {mode === 'totp' ? 'Usar código de respaldo' : 'Volver al código TOTP'}
      </button>
    </div>
  );
}
