-- ============================================================================
-- ROOFMINT — Agent plan tiers become admin-editable, not hardcoded
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- Moves the 6 pricing tiers (price, duration, lead/property caps, export
-- access) into a real table the admin can edit from the UI. The RLS
-- enforcement functions now read live from this table, so editing a tier's
-- price or caps here takes effect immediately for every agent on it — and
-- the same table is what the agent portal's "Plans" popup displays, so the
-- two can never drift out of sync.
-- ============================================================================

create table if not exists plan_tiers (
  id text primary key,
  label text not null,
  price numeric,                 -- null = "As Required"
  duration_months int not null default 1,
  property_cap int,              -- null = unlimited
  lead_cap int,                  -- null = unlimited
  can_export boolean not null default true,
  tagline text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table plan_tiers enable row level security;

drop policy if exists "plan_tiers_select_public" on plan_tiers;
create policy "plan_tiers_select_public" on plan_tiers for select
  using (true);

drop policy if exists "plan_tiers_write_admin" on plan_tiers;
create policy "plan_tiers_write_admin" on plan_tiers for all
  using (is_admin())
  with check (is_admin());

insert into plan_tiers (id, label, price, duration_months, property_cap, lead_cap, can_export, tagline, sort_order)
values
  ('trial_pack', 'Trial Pack', 2000, 1, 1, 10, false, 'A simple way to start promoting a property.', 1),
  ('primary_pack', 'Primary Pack', 3000, 1, 1, 25, true, 'More lead capacity for stronger buyer reach.', 2),
  ('month_pack', 'Month Pack', 30000, 1, 20, null, true, 'Built for consistent monthly property marketing.', 3),
  ('priority_month_pack', 'Priority Month Pack', 50000, 1, 20, null, true, '24-hour priority criteria for time-sensitive campaigns.', 4),
  ('customised_pack', 'Customised Pack', null, 1, null, null, true, 'Tailored to your specific requirement. Charges as per scope.', 5),
  ('yearly_partnership', 'Yearly Partnership', 400000, 12, null, null, true, 'Everything unlimited + high priority.', 6)
on conflict (id) do nothing;

alter publication supabase_realtime add table plan_tiers;

-- ── Re-point the per-plan rule functions at the table instead of hardcoded CASEs ─
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

-- agent_lead_visible() already calls these three functions by name, so it
-- picks up table-driven values automatically — no need to redefine it.
