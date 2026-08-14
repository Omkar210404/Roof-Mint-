-- ============================================================================
-- ROOFMINT — Consolidated repair for the agent plan system
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- agents.plan / plan_started_at never actually landed from earlier migrations
-- (05/06), which means agent_lead_visible() and the policies depending on it
-- silently failed to create too. Everything here is idempotent — safe to run
-- even though some pieces (like plan_tiers) already exist.
-- ============================================================================

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'user', 'agent'));

alter table agents add column if not exists user_id uuid references auth.users(id);
create unique index if not exists agents_user_id_key on agents(user_id) where user_id is not null;

alter table agents add column if not exists plan text;
alter table agents add column if not exists plan_started_at timestamptz;
update agents set plan = 'trial_pack' where plan is null;
alter table agents drop constraint if exists agents_plan_check;
alter table agents add constraint agents_plan_check
  check (plan in ('trial_pack', 'primary_pack', 'month_pack', 'priority_month_pack', 'customised_pack', 'yearly_partnership'));
alter table agents alter column plan set default 'trial_pack';

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

create or replace function my_agent_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from agents where user_id = auth.uid() limit 1;
$$;

drop policy if exists "agents_select_admin" on agents;
drop policy if exists "agents_select_admin_or_self" on agents;
create policy "agents_select_admin_or_self" on agents for select
  using (is_admin() or auth.uid() = user_id);

create or replace function agent_plan_duration_months(p_plan text)
returns int
language sql
stable
as $$
  select coalesce((select duration_months from plan_tiers where id = p_plan), 1);
$$;

create or replace function agent_plan_lead_cap(p_plan text)
returns int
language sql
stable
as $$
  select lead_cap from plan_tiers where id = p_plan;
$$;

create or replace function agent_plan_can_export(p_plan text)
returns boolean
language sql
stable
as $$
  select coalesce((select can_export from plan_tiers where id = p_plan), false);
$$;

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

drop policy if exists "enquiries_select_agent" on enquiries;
create policy "enquiries_select_agent" on enquiries for select
  using (assigned_agent_id = my_agent_id() and agent_lead_visible(id));

create or replace function restrict_agent_enquiry_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() and auth.role() <> 'service_role' then
    new.property_id := old.property_id;
    new.user_id := old.user_id;
    new.name := old.name;
    new.phone := old.phone;
    new.email := old.email;
    new.budget_hint := old.budget_hint;
    new.message := old.message;
    new.assigned_agent_id := old.assigned_agent_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restrict_agent_enquiry_update on enquiries;
create trigger trg_restrict_agent_enquiry_update
  before update on enquiries
  for each row execute function restrict_agent_enquiry_update();

drop policy if exists "enquiries_update_agent" on enquiries;
create policy "enquiries_update_agent" on enquiries for update
  using (assigned_agent_id = my_agent_id() and agent_lead_visible(id))
  with check (assigned_agent_id = my_agent_id());
