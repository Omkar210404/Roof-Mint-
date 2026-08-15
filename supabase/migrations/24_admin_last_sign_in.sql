-- ============================================================================
-- ROOFMINT — Surface last-sign-in activity to admin
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- Supabase Auth already records last_sign_in_at on every login automatically
-- (auth.users) — the Terms & Privacy Policy already says this data is kept
-- "to operate the platform securely", but nothing in the admin panel ever
-- actually showed it. auth.users isn't exposed to the regular API, so this
-- is a narrow SECURITY DEFINER function that hands back just id +
-- last_sign_in_at + auth-created_at, admin-gated.
-- ============================================================================

create or replace function admin_list_auth_activity()
returns table (id uuid, last_sign_in_at timestamptz, auth_created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Unauthorized';
  end if;

  return query
    select u.id, u.last_sign_in_at, u.created_at as auth_created_at
    from auth.users u;
end;
$$;

grant execute on function admin_list_auth_activity() to authenticated;
