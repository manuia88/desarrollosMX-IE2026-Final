import { TRPCError } from '@trpc/server';
import {
  createTemplateInput,
  deleteTemplateInput,
  listTemplatesInput,
  submitToMetaInput,
} from '@/features/marketing/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const FIELDS =
  'id, user_id, name, category, body, placeholders, header_type, header_content, footer, buttons, status, meta_template_id, created_at, updated_at';

export const waTemplatesRouter = router({
  list: authenticatedProcedure.input(listTemplatesInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('wa_templates')
      .select(FIELDS)
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (input.status) query = query.eq('status', input.status);

    const { data, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  create: authenticatedProcedure.input(createTemplateInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('wa_templates')
      .insert({
        user_id: ctx.user.id,
        name: input.name,
        category: input.category,
        body: input.body,
        placeholders: input.placeholders,
        header_type: input.headerType,
        header_content: input.headerContent ?? null,
        footer: input.footer ?? null,
        buttons: input.buttons,
        status: 'draft',
      })
      .select(FIELDS)
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data;
  }),

  delete: authenticatedProcedure.input(deleteTemplateInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('wa_templates')
      .delete()
      .eq('id', input.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return { success: true };
  }),

  submitToMeta: authenticatedProcedure.input(submitToMetaInput).mutation(async () => {
    // STUB ADR-018 — activar en F22 con [dependencia: Meta WhatsApp Business Cloud API + approval flow]
    // 4 señales:
    // 1) este comentario
    // 2) UI badge [próximamente · F22] en WATemplateForm submit button
    // 3) docs/04_MODULOS/M08_MARKETING.md §Integraciones externas WhatsApp Business API (Meta) flagged H2
    // 4) NOT_IMPLEMENTED 501 (este throw)
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message:
        'Meta WhatsApp Business approval flow se activa F22. H1 templates son drafts locales (Web QR style).',
    });
  }),
});
