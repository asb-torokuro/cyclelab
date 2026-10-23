-- Keep the profile table least-privilege for direct client access.
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
