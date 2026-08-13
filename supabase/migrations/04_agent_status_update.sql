-- ============================================================================
-- ROOFMINT — Agent Portal: allow status updates on own leads
-- Run this in your Supabase SQL Editor.
--
-- Agents can now mark their own assigned leads as Contacted/Follow Up/etc.
-- To keep this narrow, a trigger pins every other column (who it's assigned
-- to, the enquirer's contact details, which property, etc.) back to its
-- existing value whenever a non-admin makes the change — so even a crafted
-- direct API call can only ever move `status`, never reassign a lead to
-- themselves, edit the enquirer's info, or touch anyone else's row.
-- ============================================================================

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
  using (assigned_agent_id = my_agent_id())
  with check (assigned_agent_id = my_agent_id());
