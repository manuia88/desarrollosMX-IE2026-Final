-- F2.14.B M07 — Create operacion_attachments (factura, comprobante_pago, contrato, cfdi_pdf/xml, otros)
-- Storage path apunta a bucket Supabase Storage (creación bucket diferida — env runtime check).

create table if not exists public.operacion_attachments (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones(id) on delete cascade,
  tipo text not null check (tipo in (
    'factura','comprobante_pago','contrato','cfdi_pdf','cfdi_xml','otro'
  )),
  storage_path text not null check (char_length(storage_path) between 1 and 500),
  file_name text not null check (char_length(file_name) between 1 and 200),
  file_size_bytes integer check (file_size_bytes > 0),
  mime_type text check (char_length(mime_type) <= 100),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.operacion_attachments is
  'F14.B M07 — Adjuntos operación (factura PDF/XML, comprobante pago, contrato, CFDI). storage_path a bucket Supabase Storage operaciones.';

create index if not exists operacion_attachments_operacion_tipo_idx
  on public.operacion_attachments(operacion_id, tipo);

alter table public.operacion_attachments enable row level security;

drop policy if exists operacion_attachments_select on public.operacion_attachments;
create policy operacion_attachments_select on public.operacion_attachments
  for select to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_attachments.operacion_id and o.asesor_id = auth.uid()
    )
    or exists (
      select 1 from public.operacion_parts op
      where op.operacion_id = operacion_attachments.operacion_id and op.asesor_id = auth.uid()
    )
  );

drop policy if exists operacion_attachments_insert on public.operacion_attachments;
create policy operacion_attachments_insert on public.operacion_attachments
  for insert to authenticated
  with check (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_attachments.operacion_id and o.asesor_id = auth.uid()
    )
  );

drop policy if exists operacion_attachments_no_update on public.operacion_attachments;
create policy operacion_attachments_no_update on public.operacion_attachments
  for update to authenticated
  using (public.rls_is_admin())
  with check (public.rls_is_admin());

drop policy if exists operacion_attachments_delete on public.operacion_attachments;
create policy operacion_attachments_delete on public.operacion_attachments
  for delete to authenticated
  using (
    public.rls_is_admin()
    or exists (
      select 1 from public.operaciones o
      where o.id = operacion_attachments.operacion_id and o.asesor_id = auth.uid()
    )
  );

alter table public.operacion_commissions
  add constraint operacion_commissions_factura_attachment_fk
  foreign key (factura_attachment_id) references public.operacion_attachments(id) on delete set null;

alter table public.operacion_pagos
  add constraint operacion_pagos_comprobante_attachment_fk
  foreign key (comprobante_attachment_id) references public.operacion_attachments(id) on delete set null;
