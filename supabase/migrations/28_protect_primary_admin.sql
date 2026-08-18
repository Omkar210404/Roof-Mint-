-- ============================================================================
-- ROOFMINT — Protect the primary admin account (admin@roofmint.in)
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- Incident: the primary admin's own profile.role got flipped to 'user' from
-- the admin panel (Users > Set Role), locking them out of /admin entirely —
-- requireAdmin() only trusts profiles.role, and admins are (by design, see
-- 02_security_hardening.sql's prevent_role_self_escalation) allowed to
-- change roles including their own, so nothing stopped it. This migration:
--   1. restores admin@roofmint.in to role='admin'
--   2. adds a DB-level trigger so that account's role can never again be
--      changed away from 'admin', nor can the row be deleted — regardless of
--      whether the change comes from the app, another admin, or a direct
--      SQL/dashboard edit
--   3. exposes an admin-gated RPC so the client can hide the Delete/Set-Role
--      controls for that one row instead of just erroring after the fact
-- ============================================================================

-- ── 1. Restore ───────────────────────────────────────────────────────────
update public.profiles
set role = 'admin'
where role <> 'admin'
  and id = (select id from auth.users where email = 'admin@roofmint.in');

-- ── 2. DB-level lock ─────────────────────────────────────────────────────
create or replace function protect_primary_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
begin
  select email into target_email from auth.users where id = old.id;

  if target_email = 'admin@roofmint.in' then
    if TG_OP = 'DELETE' then
      raise exception 'The primary admin account cannot be deleted';
    elsif TG_OP = 'UPDATE' and new.role is distinct from 'admin' then
      raise exception 'The primary admin account role cannot be changed';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists trg_protect_primary_admin on profiles;
create trigger trg_protect_primary_admin
  before update or delete on profiles
  for each row execute function protect_primary_admin();

-- ── 3. Let the client know which row is protected ───────────────────────
create or replace function admin_get_primary_admin_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result uuid;
begin
  if not is_admin() then
    raise exception 'Unauthorized';
  end if;

  select id into result from auth.users where email = 'admin@roofmint.in';
  return result;
end;
$$;

grant execute on function admin_get_primary_admin_id() to authenticated;
