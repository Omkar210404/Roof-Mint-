-- ============================================================================
-- ROOFMINT — Dedicated Feedback / Support inbox
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- The "Send Us a Message" form on Help & Support (categories: General
-- Query, Property Enquiry, Site Visit Request, RERA / Legal Clarification,
-- Feedback & Suggestions) was piping every submission into the enquiries
-- table disguised as a property lead (budget_hint held a fake
-- "[Support Ticket: ...]" tag) — invisible in the admin Leads list unless
-- you knew to look for that string, and mixed in with real property leads.
-- Gives it a real home instead, same safety pattern as the enquiry RPC
-- (only visitor-controlled fields accepted, phone-based throttle, no wide-
-- open public insert policy).
-- ============================================================================

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  category text not null default 'General Query',
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

drop policy if exists "feedback_admin_all" on feedback;
create policy "feedback_admin_all" on feedback for all using (is_admin()) with check (is_admin());

create or replace function submit_feedback(
  p_name text,
  p_phone text,
  p_email text,
  p_category text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_recent_count int;
  v_safe_category text;
begin
  if p_name is null or length(trim(p_name)) < 1 then
    raise exception 'Name is required';
  end if;
  if p_phone is null or length(trim(p_phone)) < 1 then
    raise exception 'Phone is required';
  end if;
  if p_message is null or length(trim(p_message)) < 1 then
    raise exception 'Message is required';
  end if;

  select count(*) into v_recent_count
  from feedback
  where phone = p_phone
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 3 then
    raise exception 'Too many messages submitted recently — please try again in a few minutes.';
  end if;

  v_safe_category := case
    when p_category in ('General Query', 'Property Enquiry', 'Site Visit Request', 'RERA / Legal Clarification', 'Feedback & Suggestions')
    then p_category else 'General Query'
  end;

  insert into feedback (name, phone, email, category, message)
  values (p_name, p_phone, p_email, v_safe_category, p_message)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function submit_feedback(text, text, text, text, text) to anon, authenticated;
