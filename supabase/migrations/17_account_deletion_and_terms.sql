-- ============================================================================
-- ROOFMINT — Preserve enquiry/lead data on account deletion + T&C acceptance tracking
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- 1. enquiries.user_id currently has a plain foreign key to profiles(id)
--    with no ON DELETE behavior, which means the account-deletion API had
--    to explicitly delete a user's enquiries first (otherwise the profile
--    delete would fail with a FK violation) — destroying real lead/business
--    data (name, phone, message, status, assigned agent) that admin/agents
--    still need, just because the person who submitted it later deleted
--    their account. Changed to ON DELETE SET NULL: the enquiry row and all
--    its captured details survive, only the link back to the (now gone)
--    account is cleared.
--
-- 2. profiles.terms_accepted_at tracks explicit Terms & Privacy Policy
--    acceptance. Left null for all existing rows on purpose — every
--    existing user (and anyone who signed up via Google, which never
--    showed a terms checkbox) will be asked to explicitly accept on their
--    next visit.
-- ============================================================================

alter table enquiries drop constraint if exists enquiries_user_id_fkey;
alter table enquiries add constraint enquiries_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

alter table profiles add column if not exists terms_accepted_at timestamptz;
