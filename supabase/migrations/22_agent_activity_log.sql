-- ============================================================================
-- ROOFMINT — Let agents log their own activity (lead status changes)
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- activity_log so far only ever gets written to by admin actions (the
-- table's only policy requires is_admin()). Admin wants visibility into
-- agent activity too — the only write action an agent actually has is
-- changing the status of their own assigned leads, so this adds a narrow
-- INSERT policy letting an agent log exactly that, and nothing else: they
-- can only ever insert a row attributed to their own account, and only if
-- they're a real linked agent.
-- ============================================================================

drop policy if exists "activity_log_agent_insert_own" on activity_log;
create policy "activity_log_agent_insert_own" on activity_log for insert
  to authenticated
  with check (
    admin_id = auth.uid()
    and exists (select 1 from agents where user_id = auth.uid())
  );
