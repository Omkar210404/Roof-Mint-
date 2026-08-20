-- ============================================================================
-- ROOFMINT — Let WhatsApp contact work without a login, name-only
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- WhatsApp Us was gated behind login the same as the enquiry form, on the
-- reasoning "leads need a real phone number to be useful" — but a WhatsApp
-- click doesn't actually need Roofmint to already have their number: the
-- moment they hit send in that chat, their number lands in Roofmint's
-- WhatsApp inbox automatically. Requiring login (or even a phone number on
-- a web form) before that was pure friction with no data-capture benefit —
-- see the "should we gate WhatsApp" discussion. This lets a whatsapp-source
-- enquiry be logged with just a name, still tied to the property and its
-- assigned agent exactly like every other lead.
--
-- Phone stays required for source='form' (the enquiry form is meant to be
-- a real callback number an agent can act on independent of WhatsApp).
--
-- The existing anti-spam throttle keys on phone, which breaks for
-- anonymous whatsapp leads (every one would share phone='' and collide
-- after 3 total site-wide) — skipped for empty phone; the app-layer
-- per-IP rate limit added alongside this is the real backstop there.
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

  v_safe_source := case when p_source in ('form', 'whatsapp') then p_source else 'form' end;

  if v_safe_source = 'form' and (p_phone is null or length(trim(p_phone)) < 1) then
    raise exception 'Phone is required';
  end if;

  if p_phone is not null and length(trim(p_phone)) > 0 then
    select count(*) into v_recent_count
    from enquiries
    where phone = p_phone
      and created_at > now() - interval '10 minutes';

    if v_recent_count >= 3 then
      raise exception 'Too many enquiries submitted recently — please try again in a few minutes.';
    end if;
  end if;

  if p_property_id is not null then
    select primary_agent_id into v_agent_id from properties where id = p_property_id;
    if not found then
      raise exception 'This property listing is no longer available. Please refresh the page and try again.';
    end if;
  end if;

  insert into enquiries (
    property_id, user_id, assigned_agent_id, name, phone, email,
    budget_hint, message, status, source, visible_to_agent
  ) values (
    p_property_id, auth.uid(), v_agent_id, p_name, coalesce(p_phone, ''), p_email,
    p_budget_hint, p_message, 'new', v_safe_source,
    case when v_safe_source = 'whatsapp' then false else true end
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;
