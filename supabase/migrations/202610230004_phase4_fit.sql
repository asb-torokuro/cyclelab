create extension if not exists pgcrypto;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  raw_sha256 text not null check (raw_sha256 ~ '^[0-9a-f]{64}$'),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  started_at timestamptz,
  elapsed_time_s integer check (elapsed_time_s is null or elapsed_time_s >= 0),
  distance_m numeric check (distance_m is null or distance_m >= 0),
  analysis_status text not null default 'validated' check (analysis_status in ('validated','rejected','analyzed')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(owner_id, raw_sha256),
  unique(id, owner_id)
);
create index if not exists activities_owner_started_idx on public.activities(owner_id, started_at desc);

create table if not exists public.activity_samples (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.activities(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  recorded_at timestamptz not null,
  power_w integer check (power_w is null or power_w between 0 and 65535),
  heart_rate_bpm integer check (heart_rate_bpm is null or heart_rate_bpm between 1 and 255),
  cadence_rpm integer check (cadence_rpm is null or cadence_rpm between 0 and 254),
  distance_m numeric check (distance_m is null or distance_m >= 0),
  elevation_m numeric,
  latitude numeric check (latitude is null or latitude between -90 and 90),
  longitude numeric check (longitude is null or longitude >= -180 and longitude < 180),
  unique(activity_id, recorded_at),
  foreign key (activity_id, owner_id) references public.activities(id, owner_id) on delete cascade
);
create index if not exists activity_samples_owner_time_idx on public.activity_samples(owner_id, recorded_at);

create table if not exists public.activity_laps (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.activities(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lap_number integer not null check (lap_number > 0),
  started_at timestamptz,
  elapsed_time_s integer check (elapsed_time_s is null or elapsed_time_s >= 0),
  distance_m numeric check (distance_m is null or distance_m >= 0),
  unique(activity_id, lap_number),
  foreign key (activity_id, owner_id) references public.activities(id, owner_id) on delete cascade
);

create table if not exists public.training_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  ftp_w integer check (ftp_w is null or ftp_w > 0),
  ftp_type text check (ftp_type is null or ftp_type in ('manual','direct_60m','20m_estimate','ramp_estimate','other')),
  body_mass_kg numeric check (body_mass_kg is null or body_mass_kg > 0),
  ctl_days numeric not null default 42 check (ctl_days > 0),
  atl_days numeric not null default 7 check (atl_days > 0),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into storage.buckets (id, name, public) values ('fit-files', 'fit-files', false) on conflict (id) do update set public = false;

alter table public.activities enable row level security;
alter table public.activity_samples enable row level security;
alter table public.activity_laps enable row level security;
alter table public.training_settings enable row level security;
revoke all on public.activities, public.activity_samples, public.activity_laps, public.training_settings from anon, authenticated;
grant select, insert, update on public.activities, public.activity_samples, public.activity_laps, public.training_settings to authenticated;

drop policy if exists activities_owner_select on public.activities;
create policy activities_owner_select on public.activities for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists activities_owner_insert on public.activities;
create policy activities_owner_insert on public.activities for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists activities_owner_update on public.activities;
create policy activities_owner_update on public.activities for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy activity_samples_owner_select on public.activity_samples for select to authenticated using ((select auth.uid()) = owner_id);
create policy activity_samples_owner_insert on public.activity_samples for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy activity_samples_owner_update on public.activity_samples for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy activity_laps_owner_select on public.activity_laps for select to authenticated using ((select auth.uid()) = owner_id);
create policy activity_laps_owner_insert on public.activity_laps for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy activity_laps_owner_update on public.activity_laps for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy training_settings_owner_select on public.training_settings for select to authenticated using ((select auth.uid()) = owner_id);
create policy training_settings_owner_insert on public.training_settings for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy training_settings_owner_update on public.training_settings for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy fit_files_owner_select on storage.objects for select to authenticated using (bucket_id = 'fit-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy fit_files_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'fit-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy fit_files_owner_update on storage.objects for update to authenticated using (bucket_id = 'fit-files' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'fit-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
