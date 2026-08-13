-- ============================================================================
-- ROOFMINT — Agent/Broker Portal
-- Run this in your Supabase SQL Editor (this session has no direct DB access,
-- so it couldn't be applied automatically like earlier migrations).
--
-- Adds a read-only portal for agents/brokers: they log in and see only the
-- properties assigned to them and the leads assigned to them — no create,
-- edit, or delete access to anything. Admin remains unrestricted.
-- ============================================================================

-- ── Allow 'agent' as a profile role ─────────────────────────────────────────
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'user', 'agent'));

-- ── Link an agents row to an auth user (nullable — most agents have no login) ─
alter table agents add column if not exists user_id uuid references auth.users(id);
create unique index if not exists agents_user_id_key on agents(user_id) where user_id is not null;

-- ── HELPER: my_agent_id() ───────────────────────────────────────────────────
-- SECURITY DEFINER so the enquiries policy below can look up "which agent row
-- belongs to me" without that lookup itself being subject to (and recursing
-- through) the agents table's own RLS policy.
create or replace function my_agent_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from agents where user_id = auth.uid() limit 1;
$$;

-- ── AGENTS — admins see/manage all; an agent can see (only) their own row ──
drop policy if exists "agents_select_admin" on agents;
create policy "agents_select_admin_or_self" on agents for select
  using (is_admin() or auth.uid() = user_id);

-- insert/update/delete stay admin-only (existing agents_insert_admin /
-- agents_update_admin / agents_delete_admin policies from 02_security_hardening.sql).

-- ── ENQUIRIES — an agent can additionally see leads assigned to them ───────
drop policy if exists "enquiries_select_agent" on enquiries;
create policy "enquiries_select_agent" on enquiries for select
  using (assigned_agent_id = my_agent_id());

-- No insert/update/delete policy added for agents — they are view-only by
-- design (existing enquiries_update_admin / enquiries_delete_admin stay
-- admin-only, so an agent's UPDATE/DELETE attempts are rejected by RLS).

-- properties / property_media / nearby_places already have public SELECT
-- policies (properties_select_public etc. from 02_security_hardening.sql),
-- so agents can already read their assigned listings — no change needed there.
