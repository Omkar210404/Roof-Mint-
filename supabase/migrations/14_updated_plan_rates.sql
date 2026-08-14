-- ============================================================================
-- ROOFMINT — Updated partner plan rates (12 tiers)
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- Replaces the 6-tier sheet with the new 12-tier one: Trial/Primary/Month/
-- Priority Month stay (Month Pack's property cap changes 20 -> 15), new
-- 3/6/12-month tiers (each with a Priority variant) are added, and the old
-- "yearly_partnership" row becomes "One Year Pack" (same id, so any agent
-- already on it isn't orphaned) alongside a new Priority One Year Pack.
-- Customised Pack stays; a new "Contract Based" tier is added alongside it.
-- ============================================================================

alter table agents drop constraint if exists agents_plan_check;
alter table agents add constraint agents_plan_check
  check (plan in (
    'trial_pack', 'primary_pack', 'month_pack', 'priority_month_pack',
    'three_months_pack', 'priority_three_months_pack',
    'six_months_pack', 'priority_six_months_pack',
    'yearly_partnership', 'priority_one_year_pack',
    'customised_pack', 'contract_based'
  ));

insert into plan_tiers (id, label, price, duration_months, property_cap, lead_cap, can_export, tagline, sort_order)
values
  ('trial_pack', 'Trial Pack', 2000, 1, 1, 10, false, 'A simple way to start promoting a property.', 1),
  ('primary_pack', 'Primary Pack', 3000, 1, 1, 25, true, 'More lead capacity for stronger buyer reach.', 2),
  ('month_pack', 'Month Pack', 30000, 1, 15, null, true, 'Built for consistent monthly property marketing.', 3),
  ('priority_month_pack', 'Priority Month Pack', 50000, 1, 20, null, true, '24-hour priority criteria for time-sensitive campaigns.', 4),
  ('three_months_pack', 'Three Months Pack', 90000, 3, 45, null, true, 'Built for consistent three-month property marketing.', 5),
  ('priority_three_months_pack', 'Priority Three Months Pack', 100000, 3, 50, null, true, '24-hour priority criteria for time-sensitive campaigns.', 6),
  ('six_months_pack', 'Six Months Pack', 150000, 6, 90, null, true, 'Built for consistent six-month property marketing.', 7),
  ('priority_six_months_pack', 'Priority Six Months Pack', 200000, 6, 100, null, true, '24-hour priority criteria for time-sensitive campaigns.', 8),
  ('yearly_partnership', 'One Year Pack', 400000, 12, null, null, true, 'Built for consistent one-year property marketing.', 9),
  ('priority_one_year_pack', 'Priority One Year Pack', 500000, 12, null, null, true, '24-hour priority criteria for time-sensitive campaigns.', 10),
  ('customised_pack', 'Customised Pack', null, 1, null, null, true, 'Tailored to your specific requirement. Charges are applied as per scope.', 11),
  ('contract_based', 'Contract Based', null, 12, null, null, true, 'Everything unlimited + high priority.', 12)
on conflict (id) do update set
  label = excluded.label,
  price = excluded.price,
  duration_months = excluded.duration_months,
  property_cap = excluded.property_cap,
  lead_cap = excluded.lead_cap,
  can_export = excluded.can_export,
  tagline = excluded.tagline,
  sort_order = excluded.sort_order,
  updated_at = now();
