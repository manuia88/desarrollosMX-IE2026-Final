-- Pre-FASE 15 OLA 4 cierre — seeds dev plans + storage bucket project-documents
-- Plans canon: dev_free $0 / dev_starter $999 MXN / dev_pro $2997 MXN / dev_enterprise $9999 MXN custom
-- (alineado ADR-058 Studio canon Opción C híbrida — Pro+ dev = Studio Pro bundled)

INSERT INTO public.plans (code, name, audience, country_code, monthly_price_minor, currency, trial_days, is_active, sort_order, features_summary)
VALUES
  ('dev_free', 'Developer Free', 'desarrolladora', 'MX', 0, 'MXN', 0, true, 100, '{"projects_max":1,"ai_extractions_month":5,"drive_monitors_max":1,"storage_gb":2,"pricing_autopilot":false,"absorption_forecast":false,"competitive_intel":false,"predictions_tab":false,"api_access":false,"studio_bundled":false}'::jsonb),
  ('dev_starter', 'Developer Starter', 'desarrolladora', 'MX', 99900, 'MXN', 14, true, 101, '{"projects_max":5,"ai_extractions_month":20,"drive_monitors_max":5,"storage_gb":10,"pricing_autopilot":true,"absorption_forecast":false,"competitive_intel":true,"predictions_tab":false,"api_access":false,"studio_bundled":false}'::jsonb),
  ('dev_pro', 'Developer Pro', 'desarrolladora', 'MX', 299700, 'MXN', 14, true, 102, '{"projects_max":999,"ai_extractions_month":50,"drive_monitors_max":999,"storage_gb":50,"pricing_autopilot":true,"absorption_forecast":true,"competitive_intel":true,"predictions_tab":true,"api_access":false,"studio_bundled":true,"studio_tier":"pro"}'::jsonb),
  ('dev_enterprise', 'Developer Enterprise', 'desarrolladora', 'MX', 999900, 'MXN', 0, true, 103, '{"projects_max":-1,"ai_extractions_month":-1,"drive_monitors_max":-1,"storage_gb":-1,"pricing_autopilot":true,"absorption_forecast":true,"competitive_intel":true,"predictions_tab":true,"api_access":true,"bi_export":true,"studio_bundled":true,"studio_tier":"agency","custom_pricing":true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-documents', 'project-documents', false, 52428800, ARRAY['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/zip','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "project_documents_dev_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'project-documents' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin'))
);
CREATE POLICY "project_documents_dev_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'project-documents' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin'))
);
CREATE POLICY "project_documents_dev_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'project-documents' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin'))
);
CREATE POLICY "project_documents_dev_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'project-documents' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin'))
);
