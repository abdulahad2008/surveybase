-- SurveyBank.uz — Phase 2: discovery (search + filters)
-- Reviews and publications tables/RLS already exist from 0001_init.sql.
-- Run this once in the Supabase SQL editor after 0002_phase1.sql.

-- 'simple' (no stemming/stopwords) is used instead of 'english' since
-- titles/abstracts may be in Uzbek, Russian, or English.
--
-- A GENERATED ALWAYS AS ... STORED column was tried first, but Postgres
-- rejected it (42P17: generation expression is not immutable) even with
-- to_tsvector wrapped in a function declared IMMUTABLE. A trigger-maintained
-- plain column sidesteps the issue entirely — triggers have no immutability
-- requirement — and is the approach Supabase's own full-text-search guide
-- uses for this exact reason.
alter table datasets
  add column if not exists search_vector tsvector;

create or replace function datasets_search_vector_trigger() returns trigger
  language plpgsql as $$
  begin
    new.search_vector := to_tsvector(
      'simple',
      coalesce(new.title, '') || ' ' ||
      coalesce(new.abstract, '') || ' ' ||
      coalesce(array_to_string(new.topics, ' '), '')
    );
    return new;
  end;
  $$;

drop trigger if exists datasets_search_vector_update on datasets;
create trigger datasets_search_vector_update
  before insert or update on datasets
  for each row execute function datasets_search_vector_trigger();

create index if not exists datasets_search_vector_idx on datasets using gin (search_vector);

-- Backfill search_vector for any rows that already existed before this trigger.
update datasets set search_vector = to_tsvector(
  'simple',
  coalesce(title, '') || ' ' ||
  coalesce(abstract, '') || ' ' ||
  coalesce(array_to_string(topics, ' '), '')
);
