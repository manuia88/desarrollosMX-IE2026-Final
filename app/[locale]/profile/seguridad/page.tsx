import { SignOutAllButton } from '@/features/auth/components/sign-out-all-button';

export default function SeguridadPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Seguridad de la cuenta</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Gestiona tus sesiones activas y opciones de autenticación.
        </p>
      </header>

      <section className="rounded-md border p-6">
        <h2 className="text-lg font-medium">Cerrar sesión en todos los dispositivos</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Revoca todos los refresh tokens activos. Deberás iniciar sesión de nuevo en cada
          dispositivo.
        </p>
        <div className="mt-4">
          <SignOutAllButton />
        </div>
      </section>
    </main>
  );
}
