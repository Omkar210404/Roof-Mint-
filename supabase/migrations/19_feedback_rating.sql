-- ============================================================================
-- ROOFMINT — Add star rating to feedback, wire up "Rate the App"
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- The "Rate the App" modal on the Profile page (5-star picker + note) never
-- actually submitted anywhere — submitRating() just faked a success message
-- locally and threw the rating away. Adds a rating column to the feedback
-- table (reused for both Help & Support messages and app ratings) and
-- extends submit_feedback() to accept it.
-- ============================================================================

alter table feedback add column if not exists rating smallint check (rating between 1 and 5);

-- Postgres treats a different parameter list as a distinct overloaded
-- function rather than a replacement — drop the old 5-arg version first so
-- calling submit_feedback via PostgREST doesn't hit "could not choose the
-- best candidate function" ambiguity between the two signatures.
drop function if exists submit_feedback(text, text, text, text, text);

create or replace function submit_feedback(
  p_name text,
  p_phone text,
  p_email text,
  p_category text,
  p_message text,
  p_rating smallint default null
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
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'Rating must be between 1 and 5';
  end if;

  select count(*) into v_recent_count
  from feedback
  where phone = p_phone
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 3 then
    raise exception 'Too many messages submitted recently — please try again in a few minutes.';
  end if;

  v_safe_category := case
    when p_category in ('General Query', 'Property Enquiry', 'Site Visit Request', 'RERA / Legal Clarification', 'Feedback & Suggestions', 'App Rating')
    then p_category else 'General Query'
  end;

  insert into feedback (name, phone, email, category, message, rating)
  values (p_name, p_phone, p_email, v_safe_category, p_message, p_rating)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function submit_feedback(text, text, text, text, text, smallint) to anon, authenticated;
