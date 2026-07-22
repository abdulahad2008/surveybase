-- SurveyBank.uz — Phase 4 seed & launch: link-only dataset support
-- Run this once in the Supabase SQL editor (or `supabase db push`).

alter table datasets
  add column if not exists is_hosted boolean not null default true;

alter table datasets
  add column if not exists external_url text;

comment on column datasets.is_hosted is
  'false = catalog-only record; no file is stored, dataset page links out via external_url instead of offering downloads.';
comment on column datasets.external_url is
  'Source URL to send users to when is_hosted = false (e.g. a registration-gated microdata catalog).';
