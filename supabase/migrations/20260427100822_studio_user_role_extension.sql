-- F14.F.1 Sprint 0: extend user_role enum con 3 roles Studio.
-- DMX Studio dentro DMX único entorno (ADR-054). studio_photographer canon B2B2C plan Foto.

alter type public.user_role add value if not exists 'studio_user';
alter type public.user_role add value if not exists 'studio_admin';
alter type public.user_role add value if not exists 'studio_photographer';
