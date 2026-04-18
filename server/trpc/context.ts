import type { User } from '@supabase/supabase-js';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { createClient } from '@/shared/lib/supabase/server';
import type { Database } from '@/shared/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    profile = data;
  }

  return {
    supabase,
    headers: req.headers,
    user: user as User | null,
    profile,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
