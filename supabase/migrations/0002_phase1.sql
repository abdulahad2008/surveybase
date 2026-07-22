-- SurveyBank.uz — Phase 1: deposit → view → download
-- Run this once in the Supabase SQL editor after 0001_init.sql.

-- The deposit form's "optional questionnaire text" field has no home in the
-- Phase 0 schema — add it here.
alter table datasets add column if not exists questionnaire_text text;

-- ── Storage ──────────────────────────────────────────────────────────────
-- Cleaned (PII-stripped) CSVs are the only files ever written to this
-- bucket, so it's safe to make public: object paths are `${dataset_id}/...`,
-- which is not guessable without already having depositor/moderator access
-- to the dataset row. Uploads still go through RLS below (the app never
-- uses the service role key for storage writes).

insert into storage.buckets (id, name, public)
values ('dataset-files', 'dataset-files', true)
on conflict (id) do nothing;

-- The Storage API does `insert ... returning *` on every upload, so a select
-- policy is required too — without one, the read-back after a perfectly
-- valid insert fails with this same "violates row-level security policy"
-- error. Mirrors the same visibility rule as the `files` table.
create policy "Dataset files are viewable per dataset visibility"
on storage.objects for select
using (
  bucket_id = 'dataset-files'
  and exists (
    select 1 from public.datasets d
    where d.id::text = (storage.foldername(name))[1]
      and (d.status = 'published' or d.depositor_id = auth.uid() or public.is_moderator(auth.uid()))
  )
);

create policy "Depositors upload files to their own datasets"
on storage.objects for insert
with check (
  bucket_id = 'dataset-files'
  and exists (
    select 1 from public.datasets d
    where d.id::text = (storage.foldername(name))[1]
      and d.depositor_id = auth.uid()
  )
);

create policy "Depositors delete files from their own datasets"
on storage.objects for delete
using (
  bucket_id = 'dataset-files'
  and exists (
    select 1 from public.datasets d
    where d.id::text = (storage.foldername(name))[1]
      and d.depositor_id = auth.uid()
  )
);

-- ── Download counter ─────────────────────────────────────────────────────
-- The datasets update policy only lets a depositor edit their own
-- draft/pending rows, so any-visitor downloads of a *published* dataset
-- need a security-definer escape hatch to bump the counter.

create function public.increment_download_count(p_dataset_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update datasets
  set download_count = download_count + 1
  where id = p_dataset_id and status = 'published';
$$;

grant execute on function public.increment_download_count(uuid) to anon, authenticated;

-- Tighten the download_log insert policy: allow anonymous logging (user_id
-- null) but don't let a caller spoof someone else's user_id.
drop policy "Anyone can log a download" on download_log;
create policy "Anyone can log a download" on download_log
  for insert with check (user_id is null or user_id = auth.uid());
