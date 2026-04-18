-- auth_sessions_log — registro de eventos de sesión (login/logout/refresh/revoke)
-- FASE 02 / MÓDULO 2.J.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.J.1

create table public.auth_sessions_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('login', 'logout', 'refresh', 'revoke')),
  ip inet,
  user_agent text,
  aal text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_asl_profile on public.auth_sessions_log (profile_id, created_at desc);
create index idx_asl_action_created on public.auth_sessions_log (action, created_at desc);

alter table public.auth_sessions_log enable row level security;

-- SELECT: self (ver sus propios eventos) + superadmin.
create policy auth_sessions_log_select_self on public.auth_sessions_log
  for select to authenticated
  using (profile_id = auth.uid() or public.is_superadmin());

-- INSERT/UPDATE/DELETE: sólo service_role (edge function on_auth_event) o triggers
-- SECURITY DEFINER. Se revoca explícito para sellar el vector.
revoke insert, update, delete on public.auth_sessions_log from authenticated, anon;
