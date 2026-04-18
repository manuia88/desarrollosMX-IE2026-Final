import Link from 'next/link';

type Props = {
  mfaEnabled: boolean;
  rol: string;
};

const MFA_REQUIRED_ROLES = new Set([
  'superadmin',
  'admin_desarrolladora',
  'mb_admin',
  'mb_coordinator',
]);

export function MfaStatusPanel({ mfaEnabled, rol }: Props) {
  const required = MFA_REQUIRED_ROLES.has(rol);
  const missing = required && !mfaEnabled;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            mfaEnabled ? 'bg-emerald-500' : 'bg-neutral-300'
          }`}
          aria-hidden
        />
        <p className="text-sm">
          MFA (TOTP): <span className="font-medium">{mfaEnabled ? 'Activado' : 'Desactivado'}</span>
        </p>
      </div>
      {missing ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Tu rol requiere MFA obligatorio. Actívalo para continuar accediendo a áreas restringidas.{' '}
          <Link className="underline" href="/auth/mfa-enroll">
            Configurar ahora
          </Link>
        </div>
      ) : !mfaEnabled ? (
        <p className="text-sm text-neutral-600">
          Te recomendamos activar MFA para proteger tu cuenta.{' '}
          <Link className="underline" href="/auth/mfa-enroll">
            Configurar
          </Link>
        </p>
      ) : null}
    </div>
  );
}
