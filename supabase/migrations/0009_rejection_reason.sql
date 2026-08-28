-- Why a dataset was rejected, so the depositor can act on it.
--
-- Rejection was a status change and nothing else: the depositor saw "this
-- deposit was not accepted" with no way to learn whether the problem was a
-- missing consent statement, an unreadable file, or identifiable data left in
-- a column. The only route back was to guess and resubmit.
--
-- Nullable because it is optional for the moderator and because every row
-- rejected before this column existed has no reason to record; the banner
-- falls back to the old wording when it is null.
alter table datasets add column if not exists rejection_reason text;

comment on column datasets.rejection_reason is
  'Moderator''s explanation, shown to the depositor on their own dataset page.
   Visible to the depositor and to moderators only — the row is not public
   while it is rejected. Null for rejections recorded before this column.';
