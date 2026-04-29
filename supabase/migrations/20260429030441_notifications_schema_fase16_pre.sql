-- Notifications schema (fix correctivo post-FASE 15 cierre + pre-FASE 16)
-- Wiring para 9 notif types FASE 15 + base FASE 16/18

CREATE TABLE public.notification_types (
  code text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('lead','worksheet','contract','marketing','dev','postsale','admin','system')),
  default_channels jsonb NOT NULL DEFAULT '["in_app"]'::jsonb,
  template_es_mx text,
  template_en_us text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type_code text NOT NULL REFERENCES public.notification_types(code),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  channels jsonb NOT NULL DEFAULT '["in_app"]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  read_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_pending ON public.notifications(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_notifications_type ON public.notifications(type_code, created_at DESC);

ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_types_public_read ON public.notification_types
  FOR SELECT USING (is_active = true);
COMMENT ON POLICY notification_types_public_read ON public.notification_types IS 'intentional_public: catalog read-only authenticated users';

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_system_insert ON public.notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_system_update ON public.notifications
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY notifications_user_mark_read ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

INSERT INTO public.notification_types (code, category, default_channels, template_es_mx, template_en_us) VALUES
  ('hot_lead_detected', 'lead', '["in_app","wa","email"]'::jsonb, 'Lead caliente detectado: {lead_name} score {score}', 'Hot lead detected: {lead_name} score {score}'),
  ('ad_spend_pause_suggested', 'marketing', '["in_app","email"]'::jsonb, 'Canal {channel} sobre threshold — pausar sugerido', 'Channel {channel} above threshold — pause suggested'),
  ('worksheet_pending_approval', 'worksheet', '["in_app","wa"]'::jsonb, 'Worksheet pendiente aprobación: {asesor} solicita {unit}', 'Worksheet pending approval: {asesor} requests {unit}'),
  ('worksheet_decision', 'worksheet', '["in_app","wa","email"]'::jsonb, 'Worksheet {decision}: {unit}', 'Worksheet {decision}: {unit}'),
  ('contract_sent_for_signature', 'contract', '["email","wa"]'::jsonb, 'Contrato {type} enviado para firma', 'Contract {type} sent for signature'),
  ('contract_viewed', 'contract', '["in_app"]'::jsonb, 'Contrato {type} visto por {signer}', 'Contract {type} viewed by {signer}'),
  ('contract_signed', 'contract', '["email","wa","in_app"]'::jsonb, 'Contrato {type} firmado', 'Contract {type} signed'),
  ('contract_rejected', 'contract', '["email","wa","in_app"]'::jsonb, 'Contrato {type} rechazado por {signer}', 'Contract {type} rejected by {signer}'),
  ('studio_video_generated', 'marketing', '["in_app","email"]'::jsonb, 'Video proyecto {project} generado', 'Project video {project} generated')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.notifications IS 'Notifications instances con multi-channel dispatch. RLS: user owns. System inserts via dispatchNotification helper.';
COMMENT ON TABLE public.notification_types IS 'Catalog notification types con default_channels + templates i18n. Seed 9 types FASE 15 + extensible FASE 16/18.';
