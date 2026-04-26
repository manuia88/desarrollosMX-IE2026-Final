'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';
import {
  type ContactoSort,
  type ContactoStatus,
  type ContactosFilters,
  type ContactoTab,
  type ContactoView,
  filtersSchema,
} from '../schemas/filter-schemas';

function paramsFromObject(input: ContactosFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (input.tab !== 'mine') sp.set('tab', input.tab);
  if (input.view !== 'grid') sp.set('view', input.view);
  if (input.sort !== 'recent') sp.set('sort', input.sort);
  if (input.status) sp.set('status', input.status);
  if (input.q) sp.set('q', input.q);
  if (input.countryCode) sp.set('countryCode', input.countryCode);
  if (input.drawer) sp.set('drawer', input.drawer);
  return sp;
}

export function useContactosFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const filters = useMemo<ContactosFilters>(() => {
    const raw: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      raw[key] = value;
    });
    const parsed = filtersSchema.safeParse(raw);
    return parsed.success ? parsed.data : filtersSchema.parse({});
  }, [searchParams]);

  const update = useCallback(
    (patch: Partial<ContactosFilters>) => {
      const next = filtersSchema.parse({ ...filters, ...patch });
      const sp = paramsFromObject(next);
      const queryString = sp.toString();
      const path = queryString ? `?${queryString}` : '';
      startTransition(() => {
        router.replace(path === '' ? window.location.pathname : path, { scroll: false });
      });
    },
    [filters, router],
  );

  return {
    filters,
    pending,
    setTab: (tab: ContactoTab) => update({ tab }),
    setView: (view: ContactoView) => update({ view }),
    setSort: (sort: ContactoSort) => update({ sort }),
    setStatus: (status: ContactoStatus | undefined) => update({ status }),
    setSearch: (q: string | undefined) => update({ q: q && q.length > 0 ? q : undefined }),
    setCountry: (countryCode: string | undefined) => update({ countryCode }),
    openDrawer: (drawer: string | undefined) => update({ drawer }),
  };
}
