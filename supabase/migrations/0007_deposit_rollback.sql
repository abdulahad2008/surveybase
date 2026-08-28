-- Lets a depositor delete their own draft or pending dataset.
--
-- Needed so a deposit that fails halfway can undo itself. Everything after the
-- `datasets` row — the stored file, the column summaries, the publication link
-- — can fail on its own, and without this policy the half-built row stays in
-- the archive forever: the depositor retries, gets a second pending row, and a
-- moderator sees two records for one survey, one of them with no file.
--
-- Scoped exactly like the existing update policy. A published dataset is a
-- citable record with a DOI-shaped URL that other people may already have
-- linked to, so it stays undeletable by its depositor; withdrawing one is a
-- moderator decision, not a form submission.
--
-- Deleting the dataset row is enough on its own: files, survey_columns and
-- dataset_publications all reference it `on delete cascade`.
drop policy if exists "Depositors delete their own draft or pending datasets" on datasets;
create policy "Depositors delete their own draft or pending datasets" on datasets
  for delete using (
    depositor_id = auth.uid() and status in ('draft', 'pending')
  );
