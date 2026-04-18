import { LogoutClient } from '@/features/auth/components/logout-client';

export default function LogoutPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-10 text-center">
      <h1 className="text-2xl font-semibold">Cerrando sesión…</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Si no te redirigimos automáticamente, cierra esta pestaña.
      </p>
      <LogoutClient />
    </main>
  );
}
