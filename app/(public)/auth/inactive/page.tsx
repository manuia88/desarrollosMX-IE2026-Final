export default function InactivePage() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold">Cuenta inactiva</h1>
      <p className="mt-3 text-sm text-neutral-700">
        Tu cuenta está temporalmente inactiva. Si crees que esto es un error, contacta a soporte en{' '}
        <strong>soporte@desarrollosmx.com</strong>.
      </p>
      <p className="mt-6 text-sm">
        <a href="/auth/logout" className="underline">
          Cerrar sesión
        </a>
      </p>
    </main>
  );
}
