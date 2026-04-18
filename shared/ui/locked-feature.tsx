import type { ReactNode } from 'react';

type LockedFeatureCardProps = {
  feature: string;
  title?: string;
  description?: string;
  upgradeHref?: string;
  children?: ReactNode;
};

export function LockedFeatureCard({
  feature,
  title = 'Función no disponible',
  description = 'Esta función requiere un plan superior.',
  upgradeHref = '/planes',
  children,
}: LockedFeatureCardProps) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>
      <p className="mt-2 text-xs text-neutral-400">feature: {feature}</p>
      {children}
      <a
        href={upgradeHref}
        className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
      >
        Ver planes
      </a>
    </div>
  );
}
