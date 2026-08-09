-- ============================================================================
-- ROOFMINT — Security Hardening: Row Level Security
-- Run this in your Supabase SQL Editor.
--
-- Problem: every table currently has "using (true)" policies, meaning the
-- public anon key (which is, by design, embedded in the client bundle) can
-- read/write/delete ALL rows in ALL tables directly via the Supabase REST
-- API — completely bypassing the Next.js app, its middleware, and its
-- server-side admin checks. This includes confidential agent/broker contact
-- info, customer leads (enquiries), and every user's profile (including the
-- ability to self-promote to role='admin').
--
-- This migration replaces every policy with one scoped to the authenticated
-- user's identity (auth.uid()) and/or admin role.
-- ============================================================================

-- ── HELPER: is_admin() ───────────────────────────────────────────────────
-- SECURITY DEFINER so it can read `profiles` regardless of the caller's own
-- row-level permissions, avoiding policy recursion on the profiles table.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── ROLE-ESCALATION GUARD ────────────────────────────────────────────────
-- RLS is row-level, not column-level: a user who is allowed to UPDATE their
-- own profile row could otherwise also change their own `role` to 'admin'.
-- This trigger silently pins `role` to its previous value unless the actor
-- is already an admin.
create or replace function prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.role is distinct from old.role and not is_admin() then
    new.role := old.role;
  end if;
  if TG_OP = 'INSERT' and new.role = 'admin' and not is_admin() then
    new.role := 'user';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_self_escalation on profiles;
create trigger trg_prevent_role_self_escalation
  before insert or update on profiles
  for each row execute function prevent_role_self_escalation();

-- ── AUTO-PROVISION PROFILE ON SIGNUP ─────────────────────────────────────
-- Client-side inserts into `profiles` require auth.uid() = id, which is only
-- populated once a session exists. If email confirmation is enabled in
-- Supabase Auth settings, signUp() returns a user with NO active session
-- (until they click the confirmation link), so the client-side profile
-- insert in the signup page would silently fail. This trigger creates the
-- profile row server-side (SECURITY DEFINER bypasses RLS) regardless of
-- that setting, so signup is not dependent on the email-confirmation config.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, phone, role, profile_completed)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    'user',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ============================================================================
-- PROFILES — own row only, admins see/manage all
-- ============================================================================
drop policy if exists "Allow all profiles ops" on profiles;

create policy "profiles_select" on profiles for select
  using (auth.uid() = id or is_admin());

create policy "profiles_insert_own" on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update" on profiles for update
  using (auth.uid() = id or is_admin());

create policy "profiles_delete" on profiles for delete
  using (auth.uid() = id or is_admin());

-- ============================================================================
-- AGENTS — confidential broker data, admin-only (never public)
-- ============================================================================
drop policy if exists "Allow read agents" on agents;
drop policy if exists "Allow insert agents" on agents;

create policy "agents_select_admin" on agents for select
  using (is_admin());

create policy "agents_insert_admin" on agents for insert
  with check (is_admin());

create policy "agents_update_admin" on agents for update
  using (is_admin());

create policy "agents_delete_admin" on agents for delete
  using (is_admin());

-- ============================================================================
-- PROPERTIES — public can read listings, only admins write
-- ============================================================================
drop policy if exists "Public can read properties" on properties;
drop policy if exists "Allow insert properties" on properties;
drop policy if exists "Allow update properties" on properties;

create policy "properties_select_public" on properties for select
  using (true);

create policy "properties_insert_admin" on properties for insert
  with check (is_admin());

create policy "properties_update_admin" on properties for update
  using (is_admin());

create policy "properties_delete_admin" on properties for delete
  using (is_admin());

-- ============================================================================
-- PROPERTY MEDIA — public read, admin write
-- ============================================================================
drop policy if exists "Public can read media" on property_media;
drop policy if exists "Allow insert media" on property_media;

create policy "media_select_public" on property_media for select
  using (true);

create policy "media_insert_admin" on property_media for insert
  with check (is_admin());

create policy "media_update_admin" on property_media for update
  using (is_admin());

create policy "media_delete_admin" on property_media for delete
  using (is_admin());

-- ============================================================================
-- NEARBY PLACES — public read, admin write
-- ============================================================================
drop policy if exists "Public can read nearby" on nearby_places;
drop policy if exists "Allow insert nearby" on nearby_places;

create policy "nearby_select_public" on nearby_places for select
  using (true);

create policy "nearby_insert_admin" on nearby_places for insert
  with check (is_admin());

create policy "nearby_update_admin" on nearby_places for update
  using (is_admin());

create policy "nearby_delete_admin" on nearby_places for delete
  using (is_admin());

-- ============================================================================
-- ENQUIRIES / LEADS — anyone can submit (lead capture), only the submitting
-- user or an admin can read/manage their own enquiries
-- ============================================================================
drop policy if exists "Anyone can submit enquiry" on enquiries;
drop policy if exists "Allow read enquiries" on enquiries;
drop policy if exists "Allow update enquiries" on enquiries;

create policy "enquiries_insert_public" on enquiries for insert
  with check (true);

create policy "enquiries_select_own_or_admin" on enquiries for select
  using (auth.uid() = user_id or is_admin());

create policy "enquiries_update_admin" on enquiries for update
  using (is_admin());

create policy "enquiries_delete_admin" on enquiries for delete
  using (is_admin());

-- ============================================================================
-- STARRED PROPERTIES — owner only
-- ============================================================================
drop policy if exists "Users manage own stars" on starred_properties;

create policy "starred_select_own" on starred_properties for select
  using (auth.uid() = user_id);

create policy "starred_insert_own" on starred_properties for insert
  with check (auth.uid() = user_id);

create policy "starred_delete_own" on starred_properties for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- SAVED SEARCHES — owner only
-- ============================================================================
drop policy if exists "Users manage own searches" on saved_searches;

create policy "searches_select_own" on saved_searches for select
  using (auth.uid() = user_id);

create policy "searches_insert_own" on saved_searches for insert
  with check (auth.uid() = user_id);

create policy "searches_update_own" on saved_searches for update
  using (auth.uid() = user_id);

create policy "searches_delete_own" on saved_searches for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS — owner can read/mark-read/clear their own; users may seed
-- their own welcome notifications; only admins can notify other users
-- ============================================================================
drop policy if exists "Users read own notifications" on notifications;

create policy "notifications_select_own" on notifications for select
  using (auth.uid() = user_id or is_admin());

create policy "notifications_insert_own_or_admin" on notifications for insert
  with check (auth.uid() = user_id or is_admin());

create policy "notifications_update_own_or_admin" on notifications for update
  using (auth.uid() = user_id or is_admin());

create policy "notifications_delete_own_or_admin" on notifications for delete
  using (auth.uid() = user_id or is_admin());

-- ============================================================================
-- ACTIVITY LOG — admin only (enable RLS; table had no policies before)
-- ============================================================================
alter table activity_log enable row level security;

drop policy if exists "activity_log_admin_only" on activity_log;
create policy "activity_log_admin_only" on activity_log for all
  using (is_admin())
  with check (is_admin());
