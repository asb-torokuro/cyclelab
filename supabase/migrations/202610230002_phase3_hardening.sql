-- Phase 3 hardening: keep ownership and data rules enforced in PostgreSQL.
alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles add constraint profiles_display_name_check check (display_name is null or char_length(btrim(display_name)) <= 80);
revoke delete on table public.profiles from anon, authenticated;
revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;
