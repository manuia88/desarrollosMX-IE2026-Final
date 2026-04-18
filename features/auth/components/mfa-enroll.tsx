'use client';

import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

type Step = 'qr' | 'verify' | 'codes';

type EnrollStartResult = {
  factor_id: string;
  qr_code: string;
  secret: string;
  uri: string;
};

export function MfaEnroll() {
  const [step, setStep] = useState<Step>('qr');
  const [enroll, setEnroll] = useState<EnrollStartResult | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const enrollStart = trpc.mfa.enrollStart.useMutation({
    onSuccess: (data) => {
      setEnroll(data);
      setStep('qr');
    },
    onError: (err) => setError(err.message),
  });

  const challengeStart = trpc.mfa.challengeStart.useMutation({
    onSuccess: (data) => setChallengeId(data.challenge_id),
    onError: (err) => setError(err.message),
  });

  const enrollVerify = trpc.mfa.enrollVerify.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backup_codes);
      setStep('codes');
    },
    onError: (err) => setError(err.message),
  });

  if (!enroll && !enrollStart.isPending) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Activar autenticación en dos pasos</h1>
        <p className="text-sm opacity-80">
          Tu rol requiere MFA. Necesitas una app de autenticación (Google Authenticator, Authy o
          1Password).
        </p>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
          onClick={() => enrollStart.mutate()}
        >
          Comenzar
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (step === 'qr' && enroll) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Paso 1: Escanea el código QR</h1>
        <p className="text-sm opacity-80">
          Abre tu app de autenticación y escanea este código. Si no puedes escanear, usa esta clave
          manual:
        </p>
        <pre className="overflow-x-auto rounded bg-neutral-100 p-3 text-xs">{enroll.secret}</pre>
        <div
          role="img"
          aria-label="QR code"
          className="mx-auto w-48"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG viene de Supabase Auth enroll y está saneado
          dangerouslySetInnerHTML={{ __html: enroll.qr_code }}
        />
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
          onClick={() => {
            challengeStart.mutate({ factor_id: enroll.factor_id });
            setStep('verify');
          }}
        >
          Ya lo escaneé, continuar
        </button>
      </div>
    );
  }

  if (step === 'verify' && enroll) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Paso 2: Confirma el código</h1>
        <p className="text-sm opacity-80">
          Ingresa el código de 6 dígitos que aparece en tu app ahora mismo.
        </p>
        <input
          className="w-full rounded border px-3 py-2 text-center text-xl tracking-widest"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={!challengeId || code.length !== 6 || enrollVerify.isPending}
          onClick={() => {
            if (!challengeId) return;
            enrollVerify.mutate({
              factor_id: enroll.factor_id,
              challenge_id: challengeId,
              code,
            });
          }}
        >
          {enrollVerify.isPending ? 'Verificando…' : 'Verificar'}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (step === 'codes') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Códigos de respaldo</h1>
        <p className="text-sm opacity-80">
          Guarda estos 10 códigos en un lugar seguro. Solo se muestran una vez y los necesitarás si
          pierdes acceso a tu app de autenticación.
        </p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((c) => (
            <li key={c} className="rounded bg-neutral-100 px-3 py-2 text-center">
              {c}
            </li>
          ))}
        </ul>
        <a href="/" className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white">
          Ya los guardé, continuar
        </a>
      </div>
    );
  }

  return <div>Cargando…</div>;
}
