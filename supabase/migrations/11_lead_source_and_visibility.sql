-- ============================================================================
-- ROOFMINT — Lead source tracking + admin control over agent visibility
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
-- ============================================================================

-- Where a lead came from: 'form' (site enquiry form), 'whatsapp' (WhatsApp
-- click, logged-in users only), 'manual' (admin-entered). Free text, no
-- check constraint, so future sources don't need another migration.
alter table enquiries add column if not exists source text default 'form';

-- Admin override, independent of the agent's plan cap/expiry: lets admin
-- assign a lead to an agent but hold it back from their portal until
-- released, or keep specific leads permanently in-house.
alter table enquiries add column if not exists visible_to_agent boolean not null default true;

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
      when now() >= a.plan_started_at + (agent_plan_duration_months(a.plan) || ' months')::interval then false
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

-- enquiries_select_agent / enquiries_update_agent already call
-- agent_lead_visible(id), so they pick this up automatically.
