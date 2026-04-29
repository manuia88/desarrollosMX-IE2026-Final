-- FASE 17 Document Intelligence — Schema 10 tablas + SECDEF + RLS
-- Authority: ADR-062 — Pack $25 saldo IA + 22 upgrades distribuidos
-- Reusa SECDEF helpers shipped F15: dev_owns_project, dev_owns_unit, is_superadmin
-- Aplicado vía MCP apply_migration (memoria 27 acceptable pre-merge para types regen).

-- 1. document_jobs
CREATE TABLE public.document_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  unidad_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN (
    'planos_arquitectonicos','memoria_descriptiva','escritura','permiso_seduvi',
    'carta_credito_construccion','estudio_suelo','factibilidad_federal',
    'licencia_construccion','aviso_terminacion','constancia_uso_suelo',
    'predial','plano_loteo','poder_notarial','contrato_compra_venta',
    'constancia_situacion_fiscal','acta_constitutiva',
    'lista_precios','brochure','foto_render','plano_comercial','otro'
  )),
  storage_path text NOT NULL,
  original_filename text,
  file_size_bytes int,
  mime_type text,
  page_count int,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded','ocr_processing','ocr_done','extracting','extracted',
    'validating','validated','approved','rejected','error','duplicate_skipped'
  )),
  visibility text NOT NULL DEFAULT 'dev_only' CHECK (visibility IN (
    'dev_only','asesor_visible','public_derived'
  )),
  quality_score text CHECK (quality_score IN ('green','amber','red')),
  quality_score_numeric numeric(5,2),
  ai_model text,
  ai_tokens_input int DEFAULT 0,
  ai_tokens_output int DEFAULT 0,
  ai_tokens_cache_read int DEFAULT 0,
  ai_cost_usd numeric(10,4) DEFAULT 0,
  charged_credits_usd numeric(10,4) DEFAULT 0,
  drive_source_file_id text,
  duplicate_of_job_id uuid REFERENCES public.document_jobs(id) ON DELETE SET NULL,
  human_reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  human_reviewed_at timestamptz,
  human_corrections jsonb,
  error_message text,
  retry_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_jobs_dev ON public.document_jobs(desarrolladora_id, created_at DESC);
CREATE INDEX idx_doc_jobs_proyecto ON public.document_jobs(proyecto_id) WHERE proyecto_id IS NOT NULL;
CREATE INDEX idx_doc_jobs_status ON public.document_jobs(status) WHERE status IN ('uploaded','extracting','validating');
CREATE INDEX idx_doc_jobs_doc_type ON public.document_jobs(doc_type);
CREATE INDEX idx_doc_jobs_drive_source ON public.document_jobs(drive_source_file_id) WHERE drive_source_file_id IS NOT NULL;
COMMENT ON TABLE public.document_jobs IS 'F17 Document Intelligence pipeline jobs. ADR-062 visibility default dev_only para legales.';

-- 2. document_extractions (citations spans GC-7)
CREATE TABLE public.document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.document_jobs(id) ON DELETE CASCADE,
  extraction_version int NOT NULL DEFAULT 1,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric(5,2),
  extraction_engine text,
  prompt_template_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT extractions_unique_version UNIQUE (job_id, extraction_version)
);
CREATE INDEX idx_extractions_job ON public.document_extractions(job_id, extraction_version DESC);
CREATE INDEX idx_extractions_data_gin ON public.document_extractions USING GIN (extracted_data);
COMMENT ON TABLE public.document_extractions IS 'F17 extracted structured JSON con citations spans (GC-7).';

-- 3. document_validations
CREATE TABLE public.document_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.document_jobs(id) ON DELETE CASCADE,
  rule_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  message text NOT NULL,
  field_path text,
  expected_value text,
  actual_value text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_validations_job ON public.document_validations(job_id, severity);
CREATE INDEX idx_validations_unresolved ON public.document_validations(job_id) WHERE resolved_at IS NULL;
COMMENT ON TABLE public.document_validations IS 'F17 validation rules per doc type. severity critical bloquea publish.';

-- 4. document_compliance_checks (lateral #1 apuesta)
CREATE TABLE public.document_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  check_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  finding text NOT NULL,
  source_job_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  conflicting_data jsonb DEFAULT '{}'::jsonb,
  ai_recommendation text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_compliance_proyecto ON public.document_compliance_checks(proyecto_id, created_at DESC);
CREATE INDEX idx_compliance_unresolved ON public.document_compliance_checks(proyecto_id, severity) WHERE resolved_at IS NULL;
COMMENT ON TABLE public.document_compliance_checks IS 'F17 lateral #1 AI Compliance Cross-Check — único en LATAM.';

-- 5. document_doc_hashes (direct #3 dedup)
CREATE TABLE public.document_doc_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  file_hash_sha256 text NOT NULL,
  page_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  job_id uuid REFERENCES public.document_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doc_hashes_unique_per_dev UNIQUE (desarrolladora_id, file_hash_sha256)
);
CREATE INDEX idx_doc_hashes_dev_hash ON public.document_doc_hashes(desarrolladora_id, file_hash_sha256);
COMMENT ON TABLE public.document_doc_hashes IS 'F17 direct #3 dedup hash + diff. Update LP $0.30 → $0.03.';

-- 6. document_embeddings (cross-feat pgvector RAG)
CREATE TABLE public.document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.document_jobs(id) ON DELETE CASCADE,
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'dev_only' CHECK (visibility IN ('dev_only','public_derived')),
  chunk_index int NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_embeddings_job ON public.document_embeddings(job_id, chunk_index);
CREATE INDEX idx_embeddings_proyecto ON public.document_embeddings(proyecto_id) WHERE proyecto_id IS NOT NULL;
CREATE INDEX idx_embeddings_vector ON public.document_embeddings USING hnsw (embedding vector_cosine_ops) WHERE visibility = 'public_derived';
COMMENT ON TABLE public.document_embeddings IS 'F17 cross-feat pgvector RAG. visibility public_derived solo LPs/brochures. Habilita F20 Concierge.';

-- 7. dev_ai_credits (Pack $25 saldo IA)
CREATE TABLE public.dev_ai_credits (
  desarrolladora_id uuid PRIMARY KEY REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  balance_usd numeric(10,4) NOT NULL DEFAULT 0,
  total_purchased_usd numeric(12,4) NOT NULL DEFAULT 0,
  total_consumed_usd numeric(12,4) NOT NULL DEFAULT 0,
  packs_purchased_count int NOT NULL DEFAULT 0,
  last_purchase_at timestamptz,
  last_consumption_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credits_balance_non_negative CHECK (balance_usd >= 0)
);
COMMENT ON TABLE public.dev_ai_credits IS 'F17 ADR-062 saldo IA prepago Pack $25 + Markup 50%.';

-- 8. ai_credit_transactions
CREATE TABLE public.ai_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase','consumption','grant_admin','refund','adjustment')),
  amount_usd numeric(10,4) NOT NULL,
  balance_after_usd numeric(10,4) NOT NULL,
  related_job_id uuid REFERENCES public.document_jobs(id) ON DELETE SET NULL,
  stripe_payment_id text,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_tx_dev ON public.ai_credit_transactions(desarrolladora_id, created_at DESC);
CREATE INDEX idx_credit_tx_type ON public.ai_credit_transactions(type, created_at DESC);
COMMENT ON TABLE public.ai_credit_transactions IS 'F17 audit log saldo IA. type=grant_admin H1 testing.';

-- 9. drive_monitors
CREATE TABLE public.drive_monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  monitor_type text NOT NULL CHECK (monitor_type IN ('marketing_folder','legal_folder')),
  drive_folder_id text NOT NULL,
  drive_folder_url text NOT NULL,
  folder_label text,
  is_active boolean NOT NULL DEFAULT true,
  last_polled_at timestamptz,
  last_polled_files_count int DEFAULT 0,
  next_poll_at timestamptz,
  failure_count int NOT NULL DEFAULT 0,
  last_failure_message text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drive_monitors_unique_folder UNIQUE (desarrolladora_id, drive_folder_id)
);
CREATE INDEX idx_drive_monitors_dev ON public.drive_monitors(desarrolladora_id, is_active);
CREATE INDEX idx_drive_monitors_active_poll ON public.drive_monitors(next_poll_at) WHERE is_active = true;
COMMENT ON TABLE public.drive_monitors IS 'F17 Drive monitor link público (API key sola, sin OAuth).';

-- 10. drive_files_snapshot
CREATE TABLE public.drive_files_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id uuid NOT NULL REFERENCES public.drive_monitors(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  modified_time timestamptz,
  size_bytes bigint,
  job_id uuid REFERENCES public.document_jobs(id) ON DELETE SET NULL,
  ingested boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drive_snapshot_unique_file UNIQUE (monitor_id, drive_file_id)
);
CREATE INDEX idx_drive_snapshot_monitor ON public.drive_files_snapshot(monitor_id, ingested);
CREATE INDEX idx_drive_snapshot_unprocessed ON public.drive_files_snapshot(monitor_id, last_seen_at DESC) WHERE ingested = false;
COMMENT ON TABLE public.drive_files_snapshot IS 'F17 diff detection per folder. ingested=true post-process.';

-- SECDEF helper nuevo
CREATE OR REPLACE FUNCTION public.dev_owns_document_job(p_job_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.document_jobs dj JOIN public.profiles p ON p.id = auth.uid()
    WHERE dj.id = p_job_id AND (dj.desarrolladora_id = p.desarrolladora_id OR p.rol = 'superadmin')
  );
$$;
COMMENT ON FUNCTION public.dev_owns_document_job IS 'F17 SECDEF: dev owns job o superadmin.';

-- RLS habilitado en todas
ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_doc_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_files_snapshot ENABLE ROW LEVEL SECURITY;

-- document_jobs policies
CREATE POLICY document_jobs_select ON public.document_jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = document_jobs.desarrolladora_id)
  OR is_superadmin()
  OR (visibility = 'asesor_visible' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'asesor'))
  OR (visibility = 'public_derived' AND auth.uid() IS NOT NULL)
);
CREATE POLICY document_jobs_insert ON public.document_jobs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = document_jobs.desarrolladora_id AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin'))
  OR is_superadmin()
);
CREATE POLICY document_jobs_update ON public.document_jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = document_jobs.desarrolladora_id AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin'))
  OR is_superadmin()
);
CREATE POLICY document_jobs_system_update ON public.document_jobs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY document_jobs_delete ON public.document_jobs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = document_jobs.desarrolladora_id AND p.rol IN ('admin_desarrolladora','superadmin'))
  OR is_superadmin()
);

-- extractions/validations: via job ownership
CREATE POLICY document_extractions_select ON public.document_extractions FOR SELECT USING (dev_owns_document_job(job_id));
CREATE POLICY document_extractions_system_insert ON public.document_extractions FOR INSERT WITH CHECK (true);
CREATE POLICY document_validations_select ON public.document_validations FOR SELECT USING (dev_owns_document_job(job_id));
CREATE POLICY document_validations_system_insert ON public.document_validations FOR INSERT WITH CHECK (true);
CREATE POLICY document_validations_resolve ON public.document_validations FOR UPDATE USING (dev_owns_document_job(job_id)) WITH CHECK (dev_owns_document_job(job_id));

-- compliance_checks: dev owns proyecto
CREATE POLICY compliance_checks_select ON public.document_compliance_checks FOR SELECT USING (dev_owns_project(proyecto_id) OR is_superadmin());
CREATE POLICY compliance_checks_system_insert ON public.document_compliance_checks FOR INSERT WITH CHECK (true);
CREATE POLICY compliance_checks_resolve ON public.document_compliance_checks FOR UPDATE USING (dev_owns_project(proyecto_id)) WITH CHECK (dev_owns_project(proyecto_id));

-- doc_hashes
CREATE POLICY doc_hashes_select ON public.document_doc_hashes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = document_doc_hashes.desarrolladora_id) OR is_superadmin()
);
CREATE POLICY doc_hashes_system_insert ON public.document_doc_hashes FOR INSERT WITH CHECK (true);

-- embeddings
CREATE POLICY embeddings_select ON public.document_embeddings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = document_embeddings.desarrolladora_id)
  OR is_superadmin()
  OR (visibility = 'public_derived' AND auth.uid() IS NOT NULL)
);
CREATE POLICY embeddings_system_insert ON public.document_embeddings FOR INSERT WITH CHECK (true);
CREATE POLICY embeddings_system_update ON public.document_embeddings FOR UPDATE USING (true) WITH CHECK (true);

-- dev_ai_credits
CREATE POLICY dev_ai_credits_select ON public.dev_ai_credits FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = dev_ai_credits.desarrolladora_id) OR is_superadmin()
);
CREATE POLICY dev_ai_credits_system_insert ON public.dev_ai_credits FOR INSERT WITH CHECK (true);
CREATE POLICY dev_ai_credits_system_update ON public.dev_ai_credits FOR UPDATE USING (true) WITH CHECK (true);

-- credit_transactions
CREATE POLICY credit_tx_select ON public.ai_credit_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = ai_credit_transactions.desarrolladora_id) OR is_superadmin()
);
CREATE POLICY credit_tx_system_insert ON public.ai_credit_transactions FOR INSERT WITH CHECK (true);

-- drive_monitors
CREATE POLICY drive_monitors_select ON public.drive_monitors FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = drive_monitors.desarrolladora_id) OR is_superadmin()
);
CREATE POLICY drive_monitors_insert ON public.drive_monitors FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = drive_monitors.desarrolladora_id AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin')) OR is_superadmin()
);
CREATE POLICY drive_monitors_update ON public.drive_monitors FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = drive_monitors.desarrolladora_id AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin')) OR is_superadmin()
);
CREATE POLICY drive_monitors_system_update ON public.drive_monitors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY drive_monitors_delete ON public.drive_monitors FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = drive_monitors.desarrolladora_id AND p.rol IN ('admin_desarrolladora','superadmin')) OR is_superadmin()
);

-- drive_files_snapshot (via monitor ownership)
CREATE POLICY drive_snapshot_select ON public.drive_files_snapshot FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.drive_monitors dm
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE dm.id = drive_files_snapshot.monitor_id
    AND (dm.desarrolladora_id = p.desarrolladora_id OR p.rol = 'superadmin')
  )
);
CREATE POLICY drive_snapshot_system_insert ON public.drive_files_snapshot FOR INSERT WITH CHECK (true);
CREATE POLICY drive_snapshot_system_update ON public.drive_files_snapshot FOR UPDATE USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER document_jobs_set_updated_at BEFORE UPDATE ON public.document_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER dev_ai_credits_set_updated_at BEFORE UPDATE ON public.dev_ai_credits
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER drive_monitors_set_updated_at BEFORE UPDATE ON public.drive_monitors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
