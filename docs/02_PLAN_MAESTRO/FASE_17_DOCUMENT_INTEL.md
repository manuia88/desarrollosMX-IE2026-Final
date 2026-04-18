# FASE 17 — Document Intelligence Pipeline (PDFs/planos/docs oficiales → tabla estructurada verde/ámbar/rojo)

> **Duración estimada:** 5 sesiones Claude Code (~20 horas con agentes paralelos)
> **Dependencias:** FASE 03 (AI-Native Shell — wrappers Claude+GPT), FASE 06 (Storage buckets con RLS), FASE 15 (upload UI de docs ya existe — aquí agregamos pipeline).
> **Bloqueantes externos:**
> - **Anthropic API key** activa con budget mensual (~$500 MVP estimado). Sonnet 4 vision capability habilitada.
> - **Google Drive API** OAuth 2.0 credentials (Client ID + Secret) para Drive monitor. Scopes: `drive.readonly` + `drive.metadata.readonly`.
> - **Tesseract OCR** local (Docker sidecar or Vercel Function layer ~50MB extra). Fallback Claude Vision si Tesseract falla.
> - **Sharp** disponible (Fase 04 ya instaló para fotos).
> - **Supabase Queue** o BullMQ/Trigger.dev para procesamiento asíncrono de jobs pesados.
> **Resultado esperado:** Pipeline AI para docs legales/técnicos del desarrollo inmobiliario. Dev sube PDF (escrituras, permisos SEDUVI, estudio suelo, planos, memoria constructiva, carta crédito, licencia construcción). Pipeline: OCR → extraction estructurada AI → validación reglas → Quality Score verde/ámbar/rojo. Human-in-the-loop para amarillo/rojo. Google Drive monitor opcional auto-ingiere docs en folders watched. Integración bidireccional con M11 Inventario y M07 Operaciones (checklist docs legales). Cost tracking por extraction. Tag `fase-17-complete`.
> **Priority:** [H1]

## Contexto y objetivo

El flow maestro DMX inicia con "DEV sube PDF → document_job → AI extrae → Tabla verde/amarillo/rojo → DEV completa → Quality Score → Proyecto publicado" (§20.5 briefing). Sin este pipeline, los proyectos quedan con data incompleta/inconsistente, el matching falla, los compradores no confían, y el IE no puede calcular scores (garbage in, garbage out).

El engine combina OCR tradicional + AI structured extraction (Claude Sonnet 4 con function calling) + validaciones de reglas de negocio. La salida no es texto libre sino un JSON schema determinista por tipo de doc (una escritura tiene campos distintos que un permiso SEDUVI). Quality Score verde=aprobado automático, ámbar=revisión humana sugerida, rojo=bloquea publicación.

Crítico:
- Feedback loop: cada corrección humana de extracción ámbar/rojo retroalimenta prompts + Training set interno (no fine-tuning inicial, solo prompt engineering con few-shot examples).
- Cost tracking obligatorio — Anthropic billing puede escalar rápido con vision calls.
- Límites por plan: Free 5 extracciones/mes, Starter 20, Pro 50, Enterprise ilimitado.
- Drive monitor opcional pero poderoso — dev con 50 proyectos no quiere subir manualmente.

## Bloques

### BLOQUE 17.A — Schema `document_jobs` + extraction results

#### MÓDULO 17.A.1 — Tablas core

**Pasos:**
- `[17.A.1.1]` Migration `create_document_intel_schema`:
  ```sql
  CREATE TABLE document_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by uuid NOT NULL REFERENCES profiles(id),
    project_id uuid REFERENCES projects(id),
    unit_id uuid REFERENCES unidades(id),
    operation_id uuid REFERENCES operaciones(id),
    doc_type TEXT NOT NULL CHECK (doc_type IN (
      'planos_arquitectonicos','memoria_descriptiva','escritura','permiso_seduvi',
      'carta_credito_construccion','estudio_suelo','factibilidad_federal',
      'licencia_construccion','aviso_terminacion','constancia_uso_suelo',
      'predial','plano_loteo','poder_notarial','contrato_compra_venta',
      'constancia_situacion_fiscal','acta_constitutiva','otro'
    )),
    storage_path TEXT NOT NULL,
    original_filename TEXT,
    file_size_bytes INT,
    mime_type TEXT,
    page_count INT,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN (
      'uploaded','ocr_processing','ocr_done','extracting','extracted',
      'validating','validated','approved','rejected','error'
    )),
    quality_score TEXT CHECK (quality_score IN ('green','amber','red')),
    quality_score_numeric NUMERIC(5,2),
    ai_tokens_input INT,
    ai_tokens_output INT,
    ai_cost_usd NUMERIC(10,4),
    extraction_json JSONB,
    validation_errors JSONB,
    human_reviewed_by uuid REFERENCES profiles(id),
    human_reviewed_at TIMESTAMPTZ,
    human_corrections JSONB,
    drive_source_id TEXT, -- si vino de Google Drive monitor
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX idx_doc_jobs_status ON document_jobs(status) WHERE status IN ('uploaded','extracting','validating');
  CREATE INDEX idx_doc_jobs_project ON document_jobs(project_id);
  CREATE INDEX idx_doc_jobs_doc_type ON document_jobs(doc_type);
  ```
- `[17.A.1.2]` Tabla `document_extraction_templates` (catálogo schemas por tipo doc):
  ```sql
  CREATE TABLE document_extraction_templates (
    doc_type TEXT PRIMARY KEY,
    schema_json JSONB NOT NULL, -- JSONSchema definiendo campos esperados
    required_fields TEXT[], -- subset crítico
    validation_rules JSONB, -- reglas post-extraction (regex, ranges, cross-refs)
    prompt_template TEXT NOT NULL,
    few_shot_examples JSONB,
    version INT DEFAULT 1,
    active BOOLEAN DEFAULT TRUE
  );
  ```
- `[17.A.1.3]` Tabla `document_job_events` (audit lineage):
  ```sql
  CREATE TABLE document_job_events (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES document_jobs(id) ON DELETE CASCADE,
    event_type TEXT, -- 'uploaded','ocr_started','ocr_completed','extraction_started','extraction_completed','validation_passed','validation_failed','human_reviewed','approved','rejected'
    actor_id uuid REFERENCES profiles(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[17.A.1.4]` Tabla `drive_monitors`:
  ```sql
  CREATE TABLE drive_monitors (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id),
    google_folder_id TEXT NOT NULL,
    folder_name TEXT,
    oauth_token_vault_id TEXT, -- pgsodium
    project_id uuid REFERENCES projects(id), -- default asignación
    last_checked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[17.A.1.5]` RLS policies: dev ve sus jobs + project_id accesibles. Admin ve todo. Compradores NO ven doc_jobs (solo approved attachments via operation flow).

**Criterio de done del módulo:**
- [ ] Migration aplica sin errores.
- [ ] RLS probado: dev A no ve jobs de dev B.
- [ ] Seed `document_extraction_templates` con 8 tipos core (planos, escritura, seduvi, crédito, suelo, licencia, predial, uso suelo).

### BLOQUE 17.B — Upload UI + classifier sugerido

#### MÓDULO 17.B.1 — Upload UI

**Pasos:**
- `[17.B.1.1]` Ruta `/(developer)/documentos/page.tsx` con drop zone multi-file (reusar `<FileUploader>` FASE 04).
- `[17.B.1.2]` Al drop: para cada file (límite 25MB, mime types `application/pdf`, `image/jpeg`, `image/png`, `image/tiff`):
  - Upload a Storage bucket `project-documents/<user_id>/<uuid>.pdf`.
  - Thumbnail preview con react-pdf primera página.
  - Classifier AI sugiere `doc_type` con prompt: "Analiza este documento inmobiliario mexicano. Retorna JSON: { doc_type: ..., confidence: 0-1 }".
  - UI muestra dropdown pre-seleccionado con sugerencia + opción manual override.
- `[17.B.1.3]` Asignación a proyecto/unidad/operación (3 selects jerárquicos opcionales).
- `[17.B.1.4]` Botón "Procesar" crea `document_jobs` record con `status='uploaded'` → encolar job pipeline.
- `[17.B.1.5]` Listado panel derecho: jobs recientes con badge status colored + Quality Score (verde/ámbar/rojo) + action "Revisar".
- `[17.B.1.6]` Realtime channel `document_jobs:user_id=eq.${userId}` actualiza UI status sin refresh.

**Criterio de done del módulo:**
- [ ] Upload PDF 15MB persiste + crea job en <5s.
- [ ] Classifier sugiere correctamente 8/10 test docs.
- [ ] Status updates realtime.

### BLOQUE 17.C — AI pipeline: OCR → extraction → validation

#### MÓDULO 17.C.1 — Worker queue + OCR

**Pasos:**
- `[17.C.1.1]` Cron `document_job_worker` cada 30s (o queue listener via Trigger.dev si GA en fase): toma job con `status IN ('uploaded','ocr_done','extracted')` + lock `processing_started_at IS NULL OR < NOW() - interval '5 min'`.
- `[17.C.1.2]` Para job `status='uploaded'`:
  - Si PDF: extract text con pdf-parse. Si text count <200 chars (scanned PDF) → OCR path.
  - OCR path: usar Tesseract container local — `tesseract image.png stdout -l spa`. Para multi-page PDF: convertir a imágenes via `pdftoppm` luego OCR cada página.
  - Fallback si Tesseract falla (low confidence o error): Claude Sonnet 4 Vision call `/api/ai/ocr` que envía imagen base64 + prompt "Extract all visible text".
  - Guarda texto resultado en campo `extraction_json.ocr_raw_text`.
  - Update `status='ocr_done'`.
- `[17.C.1.3]` Para job `status='ocr_done'`:
  - Fetch template correspondiente `document_extraction_templates[doc_type]`.
  - Construye prompt con schema + few-shot + ocr_raw_text.
  - Llama Claude Sonnet 4 con function calling (structured output):
    ```ts
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4",
      max_tokens: 4000,
      tools: [{ name: "extract_doc_fields", input_schema: template.schema_json }],
      messages: [{ role: "user", content: buildExtractionPrompt(template, ocrText) }]
    });
    ```
  - Persiste extracción en `extraction_json.ai_extracted`, tokens + cost in respective fields.
  - Update `status='extracted'`.
- `[17.C.1.4]` Para job `status='extracted'`:
  - Corre validaciones del template `validation_rules`: regex fields (CURP formato, RFC formato), rangos (superficie m2 > 0, fecha emisión ≤ today), cross-refs (folio registro público existe en formato).
  - Clasifica quality_score:
    - **green**: 100% required_fields presentes + 100% validations pass + confidence ≥0.9.
    - **amber**: required_fields presentes pero 1+ validation warn O confidence 0.7-0.9.
    - **red**: 1+ required_field faltante O 1+ validation error O confidence <0.7.
  - `status='validated'`. Si green y auto_approve flag on → `status='approved'`.
- `[17.C.1.5]` Emit event `document_job_events` en cada transition.

**Criterio de done del módulo:**
- [ ] Worker procesa 10 PDFs test en <5 min.
- [ ] OCR fallback activa correctamente.
- [ ] Quality Score clasifica correctamente sample set.

#### MÓDULO 17.C.2 — Templates per tipo doc

**Pasos:**
- `[17.C.2.1]` Template `escritura` schema:
  ```json
  {
    "type": "object",
    "required": ["notario_num","notario_nombre","escritura_num","fecha_otorgamiento","inmueble_ubicacion","superficie_m2","valor_operacion","folio_real"],
    "properties": {
      "notario_num": { "type": "string" },
      "notario_nombre": { "type": "string" },
      "escritura_num": { "type": "string" },
      "fecha_otorgamiento": { "type": "string", "format": "date" },
      "inmueble_ubicacion": { "type": "string" },
      "superficie_m2": { "type": "number", "minimum": 1 },
      "valor_operacion": { "type": "number" },
      "folio_real": { "type": "string" },
      "vendedor_nombre": { "type": "string" },
      "comprador_nombre": { "type": "string" },
      "testigos": { "type": "array", "items": { "type": "string" } }
    }
  }
  ```
- `[17.C.2.2]` Template `permiso_seduvi`:
  ```json
  {
    "type": "object",
    "required": ["num_permiso","fecha_emision","cuenta_catastral","m2_permitidos","niveles_permitidos","uso_suelo"],
    "properties": {
      "num_permiso": { "type": "string" },
      "fecha_emision": { "type": "string", "format": "date" },
      "fecha_vencimiento": { "type": "string", "format": "date" },
      "cuenta_catastral": { "type": "string" },
      "m2_permitidos": { "type": "number" },
      "niveles_permitidos": { "type": "integer" },
      "uso_suelo": { "type": "string" },
      "densidad": { "type": "number" }
    }
  }
  ```
- `[17.C.2.3]` Template `planos_arquitectonicos` (más complejo con Claude Vision):
  ```json
  {
    "type": "object",
    "required": ["num_plano","escala","sellos","superficie_construida_m2","niveles"],
    "properties": {
      "num_plano": { "type": "string" },
      "escala": { "type": "string" },
      "sellos": { "type": "array" },
      "superficie_construida_m2": { "type": "number" },
      "superficie_terreno_m2": { "type": "number" },
      "niveles": { "type": "integer" },
      "unidades_por_nivel": { "type": "object" }
    }
  }
  ```
- `[17.C.2.4]` Template `estudio_suelo` con `capacidad_carga_kg_cm2`, `tipo_suelo`, `profundidad_cimentacion`.
- `[17.C.2.5]` Template `carta_credito_construccion` con banco, monto autorizado, fechas, tasa, garantías.
- `[17.C.2.6]` Template `licencia_construccion` con fecha emisión, vigencia, tipo obra, m2 autorizados.
- `[17.C.2.7]` Template `predial` con cuenta predial, ubicación, superficie terreno, valor catastral, avalúo.
- `[17.C.2.8]` Template `constancia_uso_suelo` con uso autorizado, restricciones, afectaciones.

**Criterio de done del módulo:**
- [ ] 8 templates seeded.
- [ ] Prompt templates renderizan con Mustache-like replacement.
- [ ] Few-shot examples extractivos correctos.

### BLOQUE 17.D — Quality Score + colores semáforo

#### MÓDULO 17.D.1 — Scoring engine

**Pasos:**
- `[17.D.1.1]` Función `calculateQualityScore(extraction, template)` en `features/document-intel/lib/scoring.ts`:
  ```ts
  function calculateQualityScore(extraction, template) {
    const required = template.required_fields;
    const presentRequired = required.filter(f => extraction[f] !== null && extraction[f] !== '').length;
    const completenessPct = presentRequired / required.length;
    const validations = runValidations(extraction, template.validation_rules);
    const validationPassPct = validations.passed / validations.total;
    const confidenceScore = extraction._meta.confidence;
    const numeric = (completenessPct * 0.4 + validationPassPct * 0.4 + confidenceScore * 0.2) * 100;
    let label;
    if (numeric >= 85 && completenessPct === 1) label = 'green';
    else if (numeric >= 65) label = 'amber';
    else label = 'red';
    return { numeric, label, details: { completenessPct, validationPassPct, confidenceScore, validationErrors: validations.errors } };
  }
  ```
- `[17.D.1.2]` UI badge `<QualityBadge score="green|amber|red" />` con colores: verde #10B981, ámbar #F59E0B, rojo #EF4444. Tooltip con detalle breakdown.
- `[17.D.1.3]` Weight config ajustable por template (some docs necesitan más completeness que confidence).

**Criterio de done del módulo:**
- [ ] Test: doc con 100% fields y conf 0.95 → green.
- [ ] Test: doc con 1 field missing → amber.
- [ ] Test: doc con 3 validation errors → red.

### BLOQUE 17.E — Human-in-the-loop review UI

#### MÓDULO 17.E.1 — Review panel

**Pasos:**
- `[17.E.1.1]` Ruta `/(developer)/documentos/[job_id]/review/page.tsx` dual-pane:
  - **Izquierda:** PDF preview con pan/zoom (react-pdf).
  - **Derecha:** Form fields con valores AI-extracted pre-populated + badge por campo (verde = alta confianza, ámbar = verificar, rojo = faltante).
- `[17.E.1.2]` Para cada campo rojo (faltante): input vacío + placeholder "Completar manualmente".
- `[17.E.1.3]` Para amber: input pre-llenado + indicator amarillo + "AI sugiere: X. Verificar."
- `[17.E.1.4]` Validaciones inline con Zod a medida que user edita.
- `[17.E.1.5]` Botones: "Guardar cambios" (actualiza `extraction_json`, marca `human_reviewed_at`), "Aprobar" (status→`approved`), "Rechazar" (status→`rejected` + razón).
- `[17.E.1.6]` Si review aprueba → sincroniza data al owner:
  - `planos`: update `projects.superficie_construida_m2_total`, `niveles`, etc.
  - `permiso_seduvi`: update `projects.uso_suelo`, `m2_permitidos`.
  - `escritura`: update `operaciones.valor_cierre` (si no existe).
  - `predial`: update `projects.cuenta_catastral`.
- `[17.E.1.7]` Audit log en `document_job_events` cada edit humano + approve/reject.

**Criterio de done del módulo:**
- [ ] Abrir doc ambar muestra campos con colored badges correctos.
- [ ] Completar fields manual + aprobar → dispara sync al owner.
- [ ] Audit log refleja cambios.

#### MÓDULO 17.E.2 — Feedback loop

**Pasos:**
- `[17.E.2.1]` Guardar `human_corrections` JSONB: diff entre `ai_extracted` y valores finales humano.
- `[17.E.2.2]` Cron semanal `document_feedback_analytics`: computa métricas por template:
  - Accuracy per field (% correcto sin corrección).
  - Top fields con más correcciones.
  - Confidence calibration (si AI dice 0.95 conf, ¿cuánto pct fue realmente correcto?).
- `[17.E.2.3]` Dashboard admin `/admin/doc-intel-analytics` con gráficos para identificar templates a mejorar.
- `[17.E.2.4]` Si un field tiene >30% correcciones → flag para prompt engineering iteration (manual Manu + Claude Code agent).

**Criterio de done del módulo:**
- [ ] Corrección humana se persiste en `human_corrections`.
- [ ] Analytics weekly calcula metrics sin errores.

### BLOQUE 17.F — Integración con Inventario + Operaciones

#### MÓDULO 17.F.1 — Vinculación con M11 Inventario

**Pasos:**
- `[17.F.1.1]` En detalle unidad/proyecto (FASE 15 M11) agregar tab "Documentos" listando `document_jobs` relacionados.
- `[17.F.1.2]` Visualización "Completitud documental": checklist de tipos de doc requeridos (escritura, seduvi, licencia, planos) con badge verde/amber/red y link al job.
- `[17.F.1.3]` Proyecto con completitud <50% → bloquear publicación al marketplace público (FASE 21 respeta este flag).
- `[17.F.1.4]` Publicación condicional: completitud ≥80% + todos verdes (o amber ≤2) → flag `projects.publishable=true`.

**Criterio de done del módulo:**
- [ ] Checklist muestra status correcto por doc type.
- [ ] Proyecto incompleto intenta publicar → error claro.

#### MÓDULO 17.F.2 — Vinculación con M07 Operaciones

**Pasos:**
- `[17.F.2.1]` En operación (M07 Fase 14) agregar tab "Documentos Legales" con checklist MX:
  - Carta oferta
  - Escritura primera venta (si aplica)
  - Contrato privado compraventa
  - Pagaré (si financiamiento)
  - Identificación comprador (INE)
  - CURP comprador
  - Constancia fiscal comprador
  - Acta matrimonio (si sociedad conyugal)
  - Apoderamiento (si poder)
- `[17.F.2.2]` Cada checklist item con upload + vinculación a `document_jobs`.
- `[17.F.2.3]` Timeline `operations_timeline` refleja estado docs: "Documentos completos ✓" milestone.
- `[17.F.2.4]` Si faltan docs para fecha escritura: notif al asesor + dev 7 días antes.

**Criterio de done del módulo:**
- [ ] Checklist completo unlock siguiente etapa operación.
- [ ] Notif 7d anticipación dispara.

### BLOQUE 17.G — Google Drive monitor

#### MÓDULO 17.G.1 — OAuth + setup

**Pasos:**
- `[17.G.1.1]` Ruta `/(developer)/documentos/drive-monitor/page.tsx` con CTA "Conectar Google Drive".
- `[17.G.1.2]` OAuth flow: redirect a Google → scopes `drive.readonly drive.metadata.readonly` → callback `/api/oauth/google-drive/callback` → guardar tokens (access + refresh) encrypted pgsodium en `drive_monitors.oauth_token_vault_id`.
- `[17.G.1.3]` UI lista folders del user's Drive (Google Drive API `files.list` con `mimeType='application/vnd.google-apps.folder'`). Dev selecciona folders a monitorear + default project asignación.
- `[17.G.1.4]` Crear `drive_monitors` record.

**Criterio de done del módulo:**
- [ ] OAuth completa roundtrip exitosamente.
- [ ] Folders listados correctamente.

#### MÓDULO 17.G.2 — Watcher cron

**Pasos:**
- `[17.G.2.1]` Cron `drive_monitor_worker` cada 15 min:
  - Para cada `drive_monitors` activo: `files.list?q='folder_id' in parents AND mimeType in ['application/pdf','image/*']&modifiedTime > last_checked_at`.
  - Por cada file nuevo: `files.get?fileId=X&alt=media` descarga → Storage upload → crea `document_jobs` con `drive_source_id=fileId`.
  - Actualiza `last_checked_at`.
- `[17.G.2.2]` Dedup: si `drive_source_id` ya existe → skip.
- `[17.G.2.3]` Rate limiting: max 50 new files por monitor por run (evita abuse).
- `[17.G.2.4]` UI log "Últimos ingests" con timestamp + file count.

**Criterio de done del módulo:**
- [ ] Drop PDF en folder Drive → auto-ingest en <30 min.
- [ ] Dedup funciona.

### BLOQUE 17.H — Límites por plan + cost tracking

#### MÓDULO 17.H.1 — Feature gating

**Pasos:**
- `[17.H.1.1]` Integrar con `resolve_features` (FASE 02): keys `dev.ai_extractions_month` (5/20/50/unlimited), `dev.drive_monitors_max` (1/5/5/unlimited).
- `[17.H.1.2]` Counter tabla `ai_usage_tracking` (ya existente) rollup mensual: al crear `document_jobs` con status=extracting, incrementa `ai_usage_tracking.extractions_count` per month.
- `[17.H.1.3]` Before queueing: checkFeatureLimit → si excedido → reject upload con error + CTA upgrade.
- `[17.H.1.4]` Notif 80% límite usage (tipo 14 notif).

**Criterio de done del módulo:**
- [ ] Free dev tras 5 extractions → 6th rejects.
- [ ] Notif 80% triggers.

#### MÓDULO 17.H.2 — Cost tracking + reporting

**Pasos:**
- `[17.H.2.1]` Cada call AI → calcula cost USD: `tokens_input * rate_input + tokens_output * rate_output` (rates Sonnet 4 actualizadas periodicamente en env config).
- `[17.H.2.2]` Persiste en `document_jobs.ai_cost_usd`.
- `[17.H.2.3]` Dashboard admin `/admin/ai-costs/doc-intel` con gráfica costos diarios/mensuales + breakdown por dev.
- `[17.H.2.4]` Alerting: si costo diario >$50 USD → email Manu. Si costo mensual >$1000 → pause service + escalation.
- `[17.H.2.5]` Dev-side: en `/contabilidad/consumo-ai` ver sus propios costos + límite plan.

**Criterio de done del módulo:**
- [ ] Cost calculated correcto con Sonnet 4 rates.
- [ ] Alert >$50/día test dispara email.

## Criterio de done de la FASE

- [ ] Schema `document_jobs` + `document_extraction_templates` + `document_job_events` + `drive_monitors` creadas.
- [ ] 8 templates seeded (escritura, seduvi, planos, estudio_suelo, carta_credito, licencia, predial, uso_suelo).
- [ ] Upload UI funcional con classifier sugerido (accuracy ≥80%).
- [ ] OCR pipeline funciona (Tesseract primary, Claude Vision fallback).
- [ ] AI extraction produce JSON estructurado conforme schemas.
- [ ] Quality Score semáforo clasifica correctamente ≥85% sample docs.
- [ ] Review UI human-in-the-loop funcional, con sync a owner tablas.
- [ ] Drive monitor auto-ingiere files en <30 min de upload a Drive.
- [ ] Feedback loop captura correcciones humanas para analytics.
- [ ] Integración Inventario (completitud docs) + Operaciones (checklist legal).
- [ ] Feature gating por plan (5/20/50/unlimited).
- [ ] Cost tracking Anthropic activo + alertas.
- [ ] i18n strings via `t('docIntel.*')`.
- [ ] Tests: Vitest coverage ≥70% en `features/document-intel/*`. Playwright e2e: upload PDF escritura sample → worker procesa → quality green → aprobación → sync proyecto.
- [ ] Docs test set 10 PDFs reales del dominio (redacted) pasan pipeline con ≥80% success sin intervención.
- [ ] Tag git `fase-17-complete`.
- [ ] Features entregados: 15 (target §9 briefing).

## Próxima fase

FASE 18 — Legal + Pagos + Escrow (Mifiel + Stripe Connect + apartado + pre-aprobación crediticia)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent E) | **Fecha:** 2026-04-17
