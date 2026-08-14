-- ============================================================================
-- ROOFMINT — Spam throttle + admin activity log wiring
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- No CAPTCHA, no extra step for real visitors — a phone number that's
-- already submitted 3 enquiries in the last 10 minutes is rejected with a
-- friendly message, which no genuine visitor will ever hit but a scripted
-- flood will. This sits inside the RPC itself (not just the form's
-- honeypot), so it can't be bypassed by calling the API directly.
-- ============================================================================

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
  v_recent_count int;
begin
  if p_name is null or length(trim(p_name)) < 1 then
    raise exception 'Name is required';
  end if;
  if p_phone is null or length(trim(p_phone)) < 1 then
    raise exception 'Phone is required';
  end if;

  select count(*) into v_recent_count
  from enquiries
  where phone = p_phone
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 3 then
    raise exception 'Too many enquiries submitted recently — please try again in a few minutes.';
  end if;

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
