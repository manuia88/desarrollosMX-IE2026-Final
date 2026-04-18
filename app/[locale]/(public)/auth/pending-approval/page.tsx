export default function PendingApprovalPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold">Solicitud en revisión</h1>
      <p className="mt-3 text-sm text-neutral-700">
        Recibimos tu solicitud de rol elevado y un administrador la evaluará en las próximas horas.
        Te avisaremos por email cuando esté aprobada.
      </p>
      <p className="mt-6 text-sm">
        <a href="/auth/logout" className="underline">
          Cerrar sesión
        </a>
      </p>
    </main>
  );
}
