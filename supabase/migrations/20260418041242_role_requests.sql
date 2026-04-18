-- role_requests: onboarding pide rol elevado (asesor/dev/etc); approved por super/mb_admin
-- FASE 02 / MÓDULO 2.C.2
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.C.2

create table public.role_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  country_code char(2) not null references public.countries(code),
  requested_role public.user_role not null,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  reason text,
  approver_id uuid references public.profiles(id),
  decided_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint chk_role_requests_no_super check (requested_role <> 'superadmin')
);

create index idx_role_requests_pending
  on public.role_requests (status, created_at desc)
  where status = 'pending';
create index idx_role_requests_profile on public.role_requests (profile_id, created_at desc);

alter table public.role_requests enable row level security;

-- SELECT: self + superadmin + mb_admin.
create policy role_requests_select_self on public.role_requests
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_superadmin()
    or (select rol from public.profiles where id = auth.uid()) = 'mb_admin'
  );

-- INSERT: self solo.
create policy role_requests_insert_self on public.role_requests
  for insert to authenticated
  with check (profile_id = auth.uid());

-- UPDATE: superadmin/mb_admin (approve/reject).
create policy role_requests_update_admin on public.role_requests
  for update to authenticated
  using (
    public.is_superadmin()
    or (select rol from public.profiles where id = auth.uid()) = 'mb_admin'
  )
  with check (
    public.is_superadmin()
    or (select rol from public.profiles where id = auth.uid()) = 'mb_admin'
  );

-- ============================================================
-- approve_role_request: SECURITY DEFINER; valida actor + aplica escalación.
-- Atraviesa trigger prevent_role_escalation (módulo 2.D.1) porque el actor es
-- superadmin/mb_admin y el trigger considera ese caso legítimo.
-- ============================================================
create or replace function public.approve_role_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_actor_role public.user_role;
  v_req record;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  select rol into v_actor_role from public.profiles where id = v_uid;
  if v_actor_role not in ('superadmin', 'mb_admin') then
    raise exception 'forbidden: only superadmin or mb_admin can approve role requests'
      using errcode = '42501';
  end if;

  select * into v_req from public.role_requests where id = p_request_id;
  if not found or v_req.status <> 'pending' then
    raise exception 'request_not_pending';
  end if;

  update public.profiles
     set rol = v_req.requested_role,
         is_approved = true,
         updated_at = now()
   where id = v_req.profile_id;

  update public.role_requests
     set status = 'approved',
         approver_id = v_uid,
         decided_at = now()
   where id = p_request_id;
end;
$$;

grant execute on function public.approve_role_request(uuid) to authenticated;

create or replace function public.reject_role_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_actor_role public.user_role;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  select rol into v_actor_role from public.profiles where id = v_uid;
  if v_actor_role not in ('superadmin', 'mb_admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.role_requests
     set status = 'rejected',
         approver_id = v_uid,
         decided_at = now(),
         reason = coalesce(p_reason, reason)
   where id = p_request_id
     and status = 'pending';
end;
$$;

grant execute on function public.reject_role_request(uuid, text) to authenticated;
