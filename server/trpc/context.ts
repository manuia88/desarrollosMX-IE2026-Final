import type { User } from '@supabase/supabase-js';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { createClient } from '@/shared/lib/supabase/server';

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    headers: req.headers,
    user: user as User | null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
