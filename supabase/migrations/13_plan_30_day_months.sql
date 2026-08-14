-- ============================================================================
-- ROOFMINT — Plan duration: fixed 30 days per "month", not calendar months
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- 'N months'::interval is calendar-month arithmetic in Postgres (varies
-- 28-31 days depending on the start date) — switching to a fixed
-- N*30-day interval so it matches src/lib/agent-plans.ts exactly and every
-- agent's plan period is predictable regardless of when it was granted.
-- ============================================================================

create or replace function agent_lead_visible(p_enquiry_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    e.visible_to_agent
    and case
      when a.plan_started_at is null then false
      when now() >= a.plan_started_at + (agent_plan_duration_months(a.plan) * 30 || ' days')::interval then false
      when agent_plan_lead_cap(a.plan) is null then true
      else (
        select count(*) from enquiries e2
        where e2.assigned_agent_id = a.id
          and e2.created_at <= e.created_at
      ) <= agent_plan_lead_cap(a.plan)
    end
  from enquiries e
  join agents a on a.id = e.assigned_agent_id
  where e.id = p_enquiry_id;
$$;
