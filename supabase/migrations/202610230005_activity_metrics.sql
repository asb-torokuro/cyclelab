alter table public.activities add column if not exists normalized_power_w numeric check (normalized_power_w is null or normalized_power_w >= 0);
alter table public.activities add column if not exists intensity_factor numeric check (intensity_factor is null or intensity_factor >= 0);
alter table public.activities add column if not exists tss numeric check (tss is null or tss >= 0);
alter table public.activities add column if not exists watts_per_kg numeric check (watts_per_kg is null or watts_per_kg >= 0);
create index if not exists activities_owner_created_idx on public.activities(owner_id, created_at desc);
