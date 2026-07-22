-- SurveyBank.uz — Phase 2: discovery (search + filters)
-- Reviews and publications tables/RLS already exist from 0001_init.sql.
-- Run this once in the Supabase SQL editor after 0002_phase1.sql.

-- 'simple' (no stemming/stopwords) is used instead of 'english' since
-- titles/abstracts may be in Uzbek, Russian, or English.
alter table datasets
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(abstract, '') || ' ' ||
      coalesce(array_to_string(topics, ' '), '')
    )
  ) stored;

create index if not exists datasets_search_vector_idx on datasets using gin (search_vector);
