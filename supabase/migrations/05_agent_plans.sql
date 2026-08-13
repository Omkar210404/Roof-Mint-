-- ============================================================================
-- ROOFMINT — Agent Portal: Trial / Paid plans
-- Run this in your Supabase SQL Editor.
--
-- Trial agents can only see their oldest 25 assigned leads, and lose access
-- entirely once their 1-month trial clock runs out — enforced here in RLS,
-- not just hidden in the UI, so it holds even against a direct API call.
-- Paid agents see everything. Admin is unaffected (always sees everything).
-- ============================================================================

alter table agents add column if not exists plan text check (plan in ('trial', 'paid')) default 'trial';
alter table agents add column if not exists trial_started_at timestamptz;

-- ── Track when a lead's status last changed (for the admin "Contacted on..." column) ─
alter table enquiries add column if not exists status_updated_at timestamptz default timezone('utc'::text, now());

create or replace function set_enquiry_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' and new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_enquiry_status_updated_at on enquiries;
create trigger trg_set_enquiry_status_updated_at
  before update on enquiries
  for each row execute function set_enquiry_status_updated_at();

-- ── HELPER: agent_lead_visible(enquiry_id) ──────────────────────────────────
-- Paid → always visible. Trial → visible only within the 1-month window AND
-- only if this lead is among that agent's oldest 25 assigned leads (ranked
-- by created_at, not by row count fetched — so it can't be gamed by paging
-- tricks). Anything else (trial expired, or the 26th+ lead) → not visible to
-- the agent; admin still sees it via is_admin() bypassing this entirely.
create or replace function agent_lead_visible(p_enquiry_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when a.plan = 'paid' then true
    when a.plan = 'trial'
      and a.trial_started_at is not null
      and now() < a.trial_started_at + interval '1 month'
    then (
      select count(*) from enquiries e2
      where e2.assigned_agent_id = a.id
        and e2.created_at <= e.created_at
    ) <= 25
    else false
  end
  from enquiries e
  join agents a on a.id = e.assigned_agent_id
  where e.id = p_enquiry_id;
$$;

drop policy if exists "enquiries_select_agent" on enquiries;
create policy "enquiries_select_agent" on enquiries for select
  using (assigned_agent_id = my_agent_id() and agent_lead_visible(id));

drop policy if exists "enquiries_update_agent" on enquiries;
create policy "enquiries_update_agent" on enquiries for update
  using (assigned_agent_id = my_agent_id() and agent_lead_visible(id))
  with check (assigned_agent_id = my_agent_id());
