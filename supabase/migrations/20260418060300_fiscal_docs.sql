-- Fiscal documents multi-country (CFDI MX, Factura DIAN CO, CAE AR, NFS-e BR, SII CL)
-- FASE 05 / MÓDULO 5.H.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_05_I18N_Y_MULTICOUNTRY.md §5.H.1

create table public.fiscal_docs (
  id uuid primary key default uuid_generate_v4(),
  country_code char(2) not null references public.countries(code),
  desarrolladora_id uuid references public.desarrolladoras(id),
  doc_type text not null check (doc_type in ('cfdi_4','factura_dian','factura_a','factura_b','factura_c','nota_credito','nota_debito','nfs_e','factura_sii')),
  series text,
  folio text,
  uuid_extern text,
  total_minor bigint not null check (total_minor >= 0),
  currency char(3) not null references public.currencies(code),
  xml_url text,
  pdf_url text,
  status text not null check (status in ('draft','issued','accepted','rejected','canceled')) default 'draft',
  issued_at timestamptz,
  canceled_at timestamptz,
  cancel_reason text,
  operacion_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_fdocs_country_status on public.fiscal_docs (country_code, status);
create index idx_fdocs_desarrolladora on public.fiscal_docs (desarrolladora_id, created_at desc);
create index idx_fdocs_uuid_extern on public.fiscal_docs (uuid_extern) where uuid_extern is not null;

alter table public.fiscal_docs enable row level security;

create policy fdocs_admin_all on public.fiscal_docs
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

comment on table public.fiscal_docs is
  'Documentos fiscales multi-country. feature contabilidad (Fase 16) popula via FiscalDocGenerator adapters por pais. Políticas per-tenant se amplian en Fase 16 cuando exista membership table.';
