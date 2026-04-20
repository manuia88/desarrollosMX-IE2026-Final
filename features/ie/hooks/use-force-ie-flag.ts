'use client';

import { useSearchParams } from 'next/navigation';

export function readForceIeFlag(
  searchParams: URLSearchParams | { readonly get: (key: string) => string | null } | null,
): boolean {
  if (!searchParams) return false;
  const raw = searchParams.get('force_ie');
  if (raw === null) return false;
  const normalized = raw.toLowerCase().trim();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function useForceIeFlag(): boolean {
  const searchParams = useSearchParams();
  return readForceIeFlag(searchParams);
}
