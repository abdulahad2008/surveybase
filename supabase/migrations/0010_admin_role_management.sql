-- Lets an admin change another user's role from the admin dashboard.
--
-- The role guard in 0005 is not the obstacle here — it already permits a
-- moderator or admin to write `role`, and it stays exactly as it was. The
-- obstacle is reachability: the only update policy on profiles is 0001's
-- `using (auth.uid() = id)`, so an admin editing somebody else's row matches
-- zero rows. PostgREST reports no error for a statement that matched nothing,
-- so without this policy the dashboard would report success and change
-- nothing at all.
--
-- The alternative was to have the server action use the service-role key,
-- which bypasses RLS and, because auth.uid() is null for it, the 0005 trigger
-- too. That would have made the app the one caller that answers to neither.
-- This way every role change still passes the trigger, under the acting
-- admin's own JWT.
--
-- Admin-only, deliberately narrower than the trigger: moderators approve and
-- reject datasets, admins decide who gets to.

create or replace function public.is_admin(uid uuid)
returns boolean
-- security definer for the same reason is_moderator needs it: this is called
-- from a policy on profiles and would otherwise recurse into that policy while
-- evaluating it.
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles where id = uid and role = 'admin'
  );
$$;

drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile" on profiles
  for update
  using (public.is_admin(auth.uid()))
  -- Spelled out rather than left to Postgres's fallback of reusing USING for
  -- the check. Both clauses test the *caller*, not the row being written, so
  -- they are the same expression here — but an admin-update policy whose check
  -- is implicit is one edit away from silently permitting the wrong write.
  with check (public.is_admin(auth.uid()));

comment on function public.is_admin(uuid) is
  'True when the profile has role = admin. Narrower than is_moderator, which
   also matches moderators.';
