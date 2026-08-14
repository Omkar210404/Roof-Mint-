-- ============================================================================
-- ROOFMINT — Security hardening pass (found via live testing)
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- Three issues found by actually attempting the attacks, not just reading
-- the code:
--
-- 1. `enquiries.agent_message` never actually landed from migration 12 (the
--    "Agent Sees" feature has been silently broken this whole time).
--
-- 2. The trigger that's supposed to lock an agent's UPDATE down to
--    status-only pins back name/phone/email/message/assigned_agent_id, but
--    NOT `visible_to_agent` or `agent_message` — live-tested and confirmed
--    an agent can flip visible_to_agent off (or on, for a lead admin
--    deliberately hid) via a direct API call, bypassing the UI entirely.
--
-- 3. `enquiries_insert_public` allows literally any actor, logged in or
--    not, to INSERT a row with `with check (true)` — meaning anyone can set
--    assigned_agent_id directly, letting them flood a specific trial
--    agent's lead cap with junk to bury real leads, or fake source/status/
--    visible_to_agent at creation time. Replaced with a SECURITY DEFINER
--    function that only accepts the fields a real visitor should control
--    (name/phone/email/budget/message/property) and computes everything
--    else server-side; the raw table INSERT is now admin/service-role only.
-- ============================================================================

alter table enquiries add column if not exists agent_message text;

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
    new.visible_to_agent := old.visible_to_agent;
    new.agent_message := old.agent_message;
    new.source := old.source;
  end if;
  return new;
end;
$$;

create or replace function submit_public_enquiry(
  p_property_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_budget_hint text,
  p_message text,
  p_source text default 'form'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
  v_new_id uuid;
  v_safe_source text;
begin
  if p_name is null or length(trim(p_name)) < 1 then
    raise exception 'Name is required';
  end if;
  if p_phone is null or length(trim(p_phone)) < 1 then
    raise exception 'Phone is required';
  end if;

  -- Only these two sources are ever chosen by public-facing code (form
  -- submit, WhatsApp click) — anything else collapses to 'form'. 'manual'
  -- is intentionally unreachable here; admin's manual-add still inserts
  -- directly under their own is_admin() session.
  v_safe_source := case when p_source in ('form', 'whatsapp') then p_source else 'form' end;

  if p_property_id is not null then
    select primary_agent_id into v_agent_id from properties where id = p_property_id;
  end if;

  insert into enquiries (
    property_id, user_id, assigned_agent_id, name, phone, email,
    budget_hint, message, status, source, visible_to_agent
  ) values (
    p_property_id, auth.uid(), v_agent_id, p_name, p_phone, p_email,
    p_budget_hint, p_message, 'new', v_safe_source,
    case when v_safe_source = 'whatsapp' then false else true end
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function submit_public_enquiry(uuid, text, text, text, text, text, text) to anon, authenticated;

drop policy if exists "enquiries_insert_public" on enquiries;
create policy "enquiries_insert_admin" on enquiries for insert
  with check (is_admin());
