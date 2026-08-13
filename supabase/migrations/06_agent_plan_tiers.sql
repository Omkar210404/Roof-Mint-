-- ============================================================================
-- ROOFMINT — Agent Portal: real 6-tier plan structure
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- Replaces the earlier simple Trial/Paid model with your actual pricing
-- tiers (Trial Pack, Primary Pack, Month Pack, Priority Month Pack,
-- Customised Pack, Yearly Partnership). Every tier is a 1-month grant except
-- Yearly Partnership (12 months). Caps and export access are enforced here
-- in Postgres (RLS + SECURITY DEFINER functions), not just hidden in the
-- UI, so they hold even against a direct API call.
-- ============================================================================

-- ── Migrate existing plan values before tightening the check constraint ────
update agents set plan = 'trial_pack' where plan = 'trial' or plan is null;
update agents set plan = 'month_pack' where plan = 'paid';

alter table agents drop constraint if exists agents_plan_check;
alter table agents add constraint agents_plan_check
  check (plan in ('trial_pack', 'primary_pack', 'month_pack', 'priority_month_pack', 'customised_pack', 'yearly_partnership'));
alter table agents alter column plan set default 'trial_pack';

alter table agents rename column trial_started_at to plan_started_at;

-- ── Per-plan rules (mirrors src/lib/agent-plans.ts — keep both in sync) ────
create or replace function agent_plan_duration_months(p_plan text)
returns int
language sql
immutable
as $$
  select case when p_plan = 'yearly_partnership' then 12 else 1 end;
$$;

create or replace function agent_plan_lead_cap(p_plan text)
returns int
language sql
immutable
as $$
  select case p_plan
    when 'trial_pack' then 10
    when 'primary_pack' then 25
    else null
  end;
$$;

create or replace function agent_plan_can_export(p_plan text)
returns boolean
language sql
immutable
as $$
  select p_plan is distinct from 'trial_pack';
$$;

-- ── Re-point lead visibility at the new plan model ──────────────────────────
create or replace function agent_lead_visible(p_enquiry_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    case
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

-- enquiries_select_agent / enquiries_update_agent policies already call
-- agent_lead_visible(id), so they pick up this new logic automatically —
-- no need to redefine them here.
