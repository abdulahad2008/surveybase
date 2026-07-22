-- SurveyBank.uz — infrastructure diagnostic.
-- Paste into the Supabase SQL editor and Run. Every row should read PASS.
-- Any FAIL tells you which migration (0001–0004) was never applied.

with expected(kind, name, migration) as (
  values
    ('table',   'profiles',              '0001'),
    ('table',   'datasets',              '0001'),
    ('table',   'files',                 '0001'),
    ('table',   'survey_columns',        '0001'),
    ('table',   'publications',          '0001'),
    ('table',   'dataset_publications',  '0001'),
    ('table',   'reviews',               '0001'),
    ('table',   'download_log',          '0001')
)
select
  e.migration,
  e.kind,
  e.name,
  case when to_regclass('public.' || e.name) is not null then 'PASS' else 'FAIL' end as status
from expected e
order by e.name

union all

-- Functions
select '0001', 'function', 'handle_new_user',
  case when exists (select 1 from pg_proc where proname = 'handle_new_user') then 'PASS' else 'FAIL' end
union all
select '0001', 'function', 'is_moderator',
  case when exists (select 1 from pg_proc where proname = 'is_moderator') then 'PASS' else 'FAIL' end
union all
select '0002', 'function', 'increment_download_count',
  case when exists (select 1 from pg_proc where proname = 'increment_download_count') then 'PASS' else 'FAIL' end
union all
select '0003', 'function', 'datasets_search_vector_trigger',
  case when exists (select 1 from pg_proc where proname = 'datasets_search_vector_trigger') then 'PASS' else 'FAIL' end

union all

-- Triggers
select '0001', 'trigger', 'on_auth_user_created',
  case when exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then 'PASS' else 'FAIL' end
union all
select '0003', 'trigger', 'datasets_search_vector_update',
  case when exists (select 1 from pg_trigger where tgname = 'datasets_search_vector_update') then 'PASS' else 'FAIL' end

union all

-- Columns added by later migrations
select '0001', 'column', 'datasets.questionnaire_text (0002)',
  case when exists (select 1 from information_schema.columns
    where table_name = 'datasets' and column_name = 'questionnaire_text') then 'PASS' else 'FAIL' end
union all
select '0003', 'column', 'datasets.search_vector',
  case when exists (select 1 from information_schema.columns
    where table_name = 'datasets' and column_name = 'search_vector') then 'PASS' else 'FAIL' end
union all
select '0004', 'column', 'datasets.is_hosted',
  case when exists (select 1 from information_schema.columns
    where table_name = 'datasets' and column_name = 'is_hosted') then 'PASS' else 'FAIL' end
union all
select '0004', 'column', 'datasets.external_url',
  case when exists (select 1 from information_schema.columns
    where table_name = 'datasets' and column_name = 'external_url') then 'PASS' else 'FAIL' end

union all

-- Storage bucket
select '0002', 'bucket', 'dataset-files',
  case when exists (select 1 from storage.buckets where id = 'dataset-files') then 'PASS' else 'FAIL' end

union all

-- RLS enabled on the core tables
select '0001', 'rls', 'datasets RLS enabled',
  case when (select relrowsecurity from pg_class where oid = 'public.datasets'::regclass) then 'PASS' else 'FAIL' end
union all
select '0002', 'policy', 'storage.objects upload policy',
  case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Depositors upload files to their own datasets') then 'PASS' else 'FAIL' end

order by 1, 2, 3;
