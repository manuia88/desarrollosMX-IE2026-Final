// SOLO en server-side: tRPC procedures, API routes, Trigger.dev jobs y crons.
// NUNCA importar desde Client Components — usa el service_role key y salta RLS.

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { requireEnv } from './env';

export function createAdminClient() {
  return createSupabaseClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
