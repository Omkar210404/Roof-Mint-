-- ============================================================================
-- ROOFMINT — Advisor cleanup: pin search_path, lock down trigger-only function
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- 1. Four helper functions had no `search_path` pinned, which the Postgres
--    linter flags because a caller with schema-creation rights could
--    theoretically shadow an unqualified object name the function relies
--    on. These are STABLE/plain helpers, but pinning is free and correct.
--
-- 2. restrict_agent_enquiry_update() is a BEFORE UPDATE trigger function —
--    it's only ever meant to run automatically as part of an UPDATE on
--    enquiries, never called directly. The advisor flagged it as callable
--    via /rest/v1/rpc/restrict_agent_enquiry_update by anon/authenticated,
--    which isn't exploitable (NEW/OLD aren't defined outside a real trigger
--    context, so a direct call just errors) but it shouldn't be reachable
--    at all. Revoking EXECUTE removes the needless exposure.
-- ============================================================================

create or replace function agent_plan_can_export(p_plan text)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((select can_export from plan_tiers where id = p_plan), false);
$$;

create or replace function agent_plan_duration_months(p_plan text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce((select duration_months from plan_tiers where id = p_plan), 1);
$$;

create or replace function agent_plan_lead_cap(p_plan text)
returns integer
language sql
stable
set search_path = public
as $$
  select lead_cap from plan_tiers where id = p_plan;
$$;

create or replace function set_enquiry_status_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function restrict_agent_enquiry_update() from anon, authenticated;
