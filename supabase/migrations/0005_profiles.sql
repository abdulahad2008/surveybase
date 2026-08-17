-- SurveyBase.uz — Phase 5: researcher profiles
-- Run this once in the Supabase SQL editor after 0004_phase4_seed.sql.

-- ── Profile fields ───────────────────────────────────────────────────────
-- All nullable, so every existing row stays valid without a backfill.

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists contact_email text;
alter table profiles add column if not exists website text;
alter table profiles add column if not exists orcid text;
alter table profiles add column if not exists avatar_url text;

comment on column profiles.contact_email is
  'Optional public contact address. Deliberately separate from auth.users.email,
   which is private and must never be exposed on a public profile page.';
comment on column profiles.orcid is
  'ORCID iD (0000-0000-0000-0000), the standard persistent researcher identifier.';
comment on column profiles.avatar_url is
  'Public URL of an object in the `avatars` bucket. Path is `${user_id}/<file>`.';

-- Keep the stored ORCID well-formed. The final character may be X (checksum).
alter table profiles drop constraint if exists profiles_orcid_format;
alter table profiles add constraint profiles_orcid_format
  check (orcid is null or orcid ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$');

-- ── SECURITY: stop users promoting themselves ────────────────────────────
-- The 0001 policy is `for update using (auth.uid() = id)` with no WITH CHECK,
-- so Postgres reuses USING for the check. That pins the row's id but says
-- nothing about `role` — any signed-in user could PATCH their own profile row
-- through PostgREST with {"role":"admin"} and gain the moderation queue.
-- Nothing in the app writes `role`, so guarding it costs nothing.
--
-- auth.uid() is null for the service-role key (seed scripts, admin client),
-- which has no JWT; those callers are already trusted and stay unaffected.

create or replace function public.enforce_role_change_is_moderated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_moderator(auth.uid()) then
    raise exception 'Only moderators can change a profile role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on profiles;
create trigger profiles_guard_role
  before update on profiles
  for each row execute function public.enforce_role_change_is_moderated();

-- ── Avatar storage ───────────────────────────────────────────────────────
-- Public bucket: avatars are shown on public researcher pages, so there is
-- nothing to hide. Writes are still restricted to the owner's own folder.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users replace their own avatar" on storage.objects;
create policy "Users replace their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ── Lookup support ───────────────────────────────────────────────────────
-- Public profile pages list a depositor's published datasets.
create index if not exists datasets_depositor_status_idx
  on datasets (depositor_id, status);
