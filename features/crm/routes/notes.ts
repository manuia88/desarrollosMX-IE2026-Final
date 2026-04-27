// FASE 13.F PR-C M03 — Contact Notes tRPC procedures (3-niveles visibility)
// RLS server-side enforces SELECT/INSERT/UPDATE/DELETE per level + ownership.
// Future LLM upgrade FASE 16+ — current handlers are deterministic CRUD only.

import { TRPCError } from '@trpc/server';
import {
  contactNoteCreateInput,
  contactNoteDeleteInput,
  contactNoteListInput,
  contactNoteUpdateInput,
} from '@/features/crm/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';

// Type-erased helper porque Database types aún no incluyen contact_notes (post db:types regen).
type ContactNotesSupabaseClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (
        col: string,
        value: unknown,
      ) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: Record<string, unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    delete: () => {
      eq: (
        col: string,
        value: unknown,
      ) => Promise<{
        data: Record<string, unknown> | null;
        error: { message: string } | null;
      }>;
    };
    select: (cols: string) => ContactNotesSelectQuery;
  };
};

interface ContactNotesSelectQuery {
  eq: (col: string, value: unknown) => ContactNotesSelectQuery;
  order: (col: string, opts?: { ascending?: boolean }) => ContactNotesSelectQuery;
  limit: (n: number) => ContactNotesSelectQuery;
  single: () => Promise<{
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  }>;
  then: <T>(
    onfulfilled: (value: {
      data: Array<Record<string, unknown>> | null;
      error: { message: string } | null;
    }) => T,
  ) => Promise<T>;
}

function cast(client: unknown): ContactNotesSupabaseClient {
  return client as ContactNotesSupabaseClient;
}

function throwInternal(error: { message: string } | null): never {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error?.message ?? 'contact_notes_query_failed',
  });
}

export const contactNotesRouter = router({
  list: authenticatedProcedure.input(contactNoteListInput).query(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('contact_notes')
      .select('id, lead_id, level, author_user_id, content_md, created_at, updated_at')
      .eq('lead_id', input.lead_id)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (error) throwInternal(error);
    return data ?? [];
  }),

  create: authenticatedProcedure.input(contactNoteCreateInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('contact_notes')
      .insert({
        lead_id: input.lead_id,
        level: input.level,
        content_md: input.content_md,
        author_user_id: ctx.user.id,
      })
      .select('id, lead_id, level, author_user_id, content_md, created_at, updated_at')
      .single();
    if (error) throwInternal(error);
    return data;
  }),

  update: authenticatedProcedure.input(contactNoteUpdateInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { data, error } = await supabase
      .from('contact_notes')
      .update({ content_md: input.content_md })
      .eq('id', input.id)
      .select('id, lead_id, level, author_user_id, content_md, created_at, updated_at')
      .single();
    if (error) throwInternal(error);
    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'contact_note_not_found_or_forbidden',
      });
    }
    return data;
  }),

  delete: authenticatedProcedure.input(contactNoteDeleteInput).mutation(async ({ ctx, input }) => {
    const supabase = cast(ctx.supabase);
    const { error } = await supabase.from('contact_notes').delete().eq('id', input.id);
    if (error) throwInternal(error);
    return { ok: true as const, id: input.id };
  }),
});

export type ContactNotesRouter = typeof contactNotesRouter;
