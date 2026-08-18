-- ============================================================================
-- ROOFMINT — Protect the primary admin's auth account, not just its profile
-- Run this in your Supabase SQL Editor.
--
-- 28_protect_primary_admin.sql blocks deleting/demoting the `profiles` row
-- for admin@roofmint.in, but that row has no FK to auth.users (Supabase
-- provisions it via the handle_new_auth_user trigger, not a constraint) —
-- so deleting the actual auth.users row (e.g. from the Supabase Auth
-- dashboard) would still lock the admin out of logging in at all, profile
-- protection notwithstanding. This blocks that at the source.
-- ============================================================================

create or replace function protect_primary_admin_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email = 'admin@roofmint.in' then
    raise exception 'The primary admin account cannot be deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_protect_primary_admin_auth_user on auth.users;
create trigger trg_protect_primary_admin_auth_user
  before delete on auth.users
  for each row execute function protect_primary_admin_auth_user();
