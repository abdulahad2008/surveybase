-- Which tool an online survey was actually run with (Google Forms, Telegram
-- bot, KoboToolbox…).
--
-- It gets its own column rather than being folded into `collection_method`
-- because the two answer different questions — how respondents were reached
-- versus what software carried it — and only a separate column can be counted
-- or filtered. Buried inside a method string it would be prose, matchable only
-- by LIKE '%Google%', which breaks the first time someone writes "Google Form".
--
-- Nullable on purpose: a face-to-face or paper survey has no platform, and the
-- form only asks once the method implies one.
alter table datasets add column if not exists collection_platform text;

comment on column datasets.collection_platform is
  'Tool used to run the survey (Google Forms, Telegram bot, …). Null for offline methods.';
