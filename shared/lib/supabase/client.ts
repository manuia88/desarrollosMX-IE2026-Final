import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/shared/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
