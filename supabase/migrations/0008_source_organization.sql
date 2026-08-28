-- Who actually ran the survey, when that is not the person who deposited it.
--
-- The archive's seeded datasets come from UNICEF, the World Bank and the EBRD.
-- Their citations were crediting "SurveyBase.uz" — the archive that holds the
-- file — which misattributes other people's fieldwork and gives anyone citing
-- it the wrong author. There was nowhere to put the real one: `depositor_id`
-- points at the account that uploaded the row, and for a seeded dataset that
-- is an administrator, not the survey's author.
--
-- Nullable, because for an ordinary deposit the depositor *is* the source and
-- the profile name is the right credit. Citation code reads depositor name,
-- then this, then the anonymous fallback.
alter table datasets add column if not exists source_organization text;

comment on column datasets.source_organization is
  'Organisation that conducted the survey, when it is not the depositor
   (UNICEF, World Bank, …). Takes precedence over the anonymous fallback in
   citations and in schema.org creator. Null for ordinary deposits.';
