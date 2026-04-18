'use client';

import { useState } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { type SignupInput, signupInputSchema } from '@/shared/schemas/auth';

const COUNTRIES = [
  { code: 'MX', label: 'México', defaultLocale: 'es-MX' },
  { code: 'CO', label: 'Colombia', defaultLocale: 'es-CO' },
  { code: 'AR', label: 'Argentina', defaultLocale: 'es-AR' },
  { code: 'BR', label: 'Brasil', defaultLocale: 'pt-BR' },
  { code: 'CL', label: 'Chile', defaultLocale: 'es-CL' },
  { code: 'US', label: 'United States', defaultLocale: 'en-US' },
] as const;

export function SignupForm({ geoTimezoneHint }: { geoTimezoneHint?: string | null } = {}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    country_code: 'MX' as SignupInput['country_code'],
    preferred_locale: 'es-MX' as SignupInput['preferred_locale'],
    accept_tos: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    try {
      const parsed = signupInputSchema.safeParse(form);
      if (!parsed.success) {
        const flat: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join('.');
          if (!flat[key]) flat[key] = issue.message;
        }
        setFieldErrors(flat);
        return;
      }

      const supabase = createClient();
      const browserTimezone =
        typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            first_name: parsed.data.first_name,
            last_name: parsed.data.last_name,
            country_code: parsed.data.country_code,
            preferred_locale: parsed.data.preferred_locale,
            preferred_timezone: geoTimezoneHint ?? browserTimezone ?? undefined,
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      window.location.href = '/auth/onboarding';
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm">Nombre</span>
          <input
            className="w-full rounded border px-3 py-2"
            autoComplete="given-name"
            required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
          {fieldErrors.first_name ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.first_name}</p>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Apellido</span>
          <input
            className="w-full rounded border px-3 py-2"
            autoComplete="family-name"
            required
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
          {fieldErrors.last_name ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.last_name}</p>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm">Email</span>
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {fieldErrors.email ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm">Contraseña</span>
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <p className="mt-1 text-xs opacity-70">
          Mínimo 12 caracteres, con mayúscula, minúscula, dígito y símbolo.
        </p>
        {fieldErrors.password ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm">País</span>
        <select
          className="w-full rounded border px-3 py-2"
          value={form.country_code}
          onChange={(e) => {
            const next = COUNTRIES.find((c) => c.code === e.target.value);
            if (!next) return;
            setForm({
              ...form,
              country_code: next.code,
              preferred_locale: next.defaultLocale as SignupInput['preferred_locale'],
            });
          }}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.accept_tos}
          onChange={(e) => setForm({ ...form, accept_tos: e.target.checked })}
        />
        <span>
          Acepto los{' '}
          <a className="underline" href="/legal/terminos">
            términos y condiciones
          </a>{' '}
          y el{' '}
          <a className="underline" href="/legal/privacidad">
            aviso de privacidad
          </a>
          .
        </span>
      </label>
      {fieldErrors.accept_tos ? (
        <p className="text-xs text-red-600">Debes aceptar los términos para continuar.</p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        disabled={pending}
      >
        {pending ? 'Creando…' : 'Crear cuenta'}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-center text-sm">
        ¿Ya tienes cuenta?{' '}
        <a href="/auth/login" className="underline">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}
