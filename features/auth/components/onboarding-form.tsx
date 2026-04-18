'use client';

import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

type Intent = 'comprador' | 'asesor' | 'desarrolladora' | 'vendedor_publico';

const INTENTS: { value: Intent; title: string; description: string }[] = [
  {
    value: 'comprador',
    title: 'Soy comprador',
    description: 'Busco departamento, casa o terreno. Uso los índices y dossiers para decidir.',
  },
  {
    value: 'asesor',
    title: 'Soy asesor inmobiliario',
    description: 'Gestiono clientes, captaciones y cierres. Requiere aprobación de un admin.',
  },
  {
    value: 'desarrolladora',
    title: 'Represento una desarrolladora',
    description: 'Publico proyectos nuevos y administro inventario. Requiere aprobación.',
  },
  {
    value: 'vendedor_publico',
    title: 'Vendo una propiedad particular',
    description: 'Publico una sola propiedad (usada). Sin aprobación.',
  },
];

export function OnboardingForm() {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.roleRequest.submit.useMutation();

  async function handleSubmit() {
    if (!intent) return;
    if (intent === 'comprador') {
      // Ya es comprador por default; saltamos role_request y mandamos a home.
      window.location.href = '/';
      return;
    }
    const mappedRole = intent === 'desarrolladora' ? 'admin_desarrolladora' : intent;
    await submit.mutateAsync({
      requested_role: mappedRole as 'asesor' | 'admin_desarrolladora' | 'vendedor_publico',
      reason: reason.trim() || undefined,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Solicitud enviada</h1>
        <p className="text-sm opacity-80">
          Tu solicitud está en revisión. Recibirás una notificación cuando un administrador la
          apruebe. Mientras, puedes navegar como comprador.
        </p>
        <a href="/" className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white">
          Ir al inicio
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">¿Cómo vas a usar DesarrollosMX?</h1>
        <p className="mt-1 text-sm opacity-80">
          Elige la opción que mejor describe tu intención. Los roles elevados requieren aprobación.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Selecciona un rol</legend>
        {INTENTS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer gap-3 rounded-md border p-4 transition ${
              intent === opt.value ? 'border-blue-600 bg-blue-50' : 'border-neutral-200'
            }`}
          >
            <input
              type="radio"
              name="intent"
              value={opt.value}
              checked={intent === opt.value}
              onChange={() => setIntent(opt.value)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{opt.title}</span>
              <span className="block text-sm opacity-80">{opt.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {intent && intent !== 'comprador' ? (
        <label className="block">
          <span className="mb-1 block text-sm">Cuéntanos brevemente (opcional)</span>
          <textarea
            className="w-full rounded border px-3 py-2"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: trabajo en ACME Bienes Raíces desde 2022"
          />
        </label>
      ) : null}

      <button
        type="button"
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        disabled={!intent || submit.isPending}
        onClick={handleSubmit}
      >
        {submit.isPending ? 'Enviando…' : intent === 'comprador' ? 'Continuar' : 'Enviar solicitud'}
      </button>
      {submit.error ? <p className="text-sm text-red-600">{submit.error.message}</p> : null}
    </div>
  );
}
