// Transitional augmented admin client para tablas creadas en BLOQUE 11.S
// (zone_slugs) cuyo typedef aún no está en shared/types/database.ts.
//
// Motivo: `db:types` regenera post `supabase db push`. Entre el merge del
// migration archivo y la regeneración, TypeScript no conoce la tabla, y
// el tipo Database fuerza `never` en Insert/Update.
//
// Scope del workaround: UN SOLO `as unknown as` encapsulado aquí. Todos
// los callers (atlas router + seed script + pages) consumen
// createAdminClientExt() y obtienen un SupabaseClient tipado con las
// tablas conocidas.
//
// Cleanup trigger: tras `npm run db:types` post-push 11.S, el tipo
// Database incluirá `zone_slugs` — borrar este archivo + retarget callers
// a `createAdminClient()`. Agendado L-NEW10 en LATERAL_UPGRADES_PIPELINE.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/shared/types/database';
import { createAdminClient } from './admin';

type ZoneSlugsRow = {
  id: string;
  zone_id: string;
  scope_type: string;
  slug: string;
  country_code: string;
  source_label: string;
  created_at: string;
  updated_at: string;
};

type ZoneSlugsInsert = {
  zone_id: string;
  scope_type: string;
  slug: string;
  country_code: string;
  source_label: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type DatabaseWithAtlasExt = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: Database['public']['Tables'] & {
      zone_slugs: {
        Row: ZoneSlugsRow;
        Insert: ZoneSlugsInsert;
        Update: Partial<ZoneSlugsInsert>;
        Relationships: [];
      };
    };
  };
};

export function createAdminClientExt(): SupabaseClient<DatabaseWithAtlasExt> {
  return createAdminClient() as unknown as SupabaseClient<DatabaseWithAtlasExt>;
}

// Re-export Json para consumers que la necesiten sin cruzar imports.
export type { Json };
