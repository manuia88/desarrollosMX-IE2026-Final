'use client';

import { useState } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { loginInputSchema } from '@/shared/schemas/auth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const parsed = loginInputSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError('invalid_input');
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find((f) => f.status === 'verified');
      const localeMatch = window.location.pathname.match(/^\/([a-z]{2}-[A-Z]{2})\//);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');
      if (totpFactor) {
        window.location.href = `${localePrefix}/auth/mfa-verify?factor=${encodeURIComponent(totpFactor.id)}`;
        return;
      }
      window.location.href = redirectTo || `${localePrefix}/desarrolladores/dashboard`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'login_failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-semibold">Inicia sesión</h1>
      <label className="block">
        <span className="mb-1 block text-sm">Email</span>
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm">Contraseña</span>
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        disabled={pending}
      >
        {pending ? 'Ingresando…' : 'Entrar'}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-center text-sm">
        <a href="/auth/signup" className="underline">
          Crear cuenta
        </a>
      </p>
    </form>
  );
}
