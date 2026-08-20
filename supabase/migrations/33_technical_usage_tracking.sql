-- ============================================================================
-- ROOFMINT — Self-tracked technical/API usage, for the admin "Technical
-- Usage" panel
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- We can't pull Vercel's or Google's real usage numbers in without API
-- tokens we don't have — but every AI chat call, WhatsApp lead, and
-- rate-limit hit already passes through our own code, so we can count
-- those ourselves. Daily rollup counters (not one row per event) to avoid
-- the tracker itself eating into the very DB-size budget it's watching.
-- ============================================================================

create table if not exists technical_usage_daily (
  day date not null default current_date,
  metric text not null,
  count int not null default 0,
  primary key (day, metric)
);

alter table technical_usage_daily enable row level security;

create policy technical_usage_admin_read on technical_usage_daily for select to authenticated
  using ((select is_admin()));

-- No direct write policy — all writes go through increment_technical_usage()
-- below (security definer), never a raw insert/update from the client.

grant select on technical_usage_daily to authenticated;

-- Called from public-facing routes (anon or authenticated callers) right
-- after something worth counting happens — an AI chat call, a rate-limit
-- hit, a WhatsApp lead. Fire-and-forget from the caller's side, same
-- spirit as logActivity: never block or fail the real action over this.
create or replace function increment_technical_usage(p_metric text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into technical_usage_daily (day, metric, count)
  values (current_date, p_metric, 1)
  on conflict (day, metric) do update set count = technical_usage_daily.count + 1;
end;
$$;

grant execute on function increment_technical_usage(text) to anon, authenticated;

-- Admin-gated read: DB size (the tightest of the three free-tier ceilings —
-- Supabase Free caps at 500MB), key table row counts as a growth proxy, and
-- the last 30 days of self-tracked counters.
create or replace function admin_get_technical_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not is_admin() then
    raise exception 'Unauthorized';
  end if;

  select jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'row_counts', jsonb_build_object(
      'profiles', (select count(*) from profiles),
      'properties', (select count(*) from properties),
      'enquiries', (select count(*) from enquiries),
      'activity_log', (select count(*) from activity_log),
      'notifications', (select count(*) from notifications),
      'bills', (select count(*) from bills)
    ),
    'daily_usage', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'metric', metric, 'count', count) order by day desc), '[]'::jsonb)
      from technical_usage_daily
      where day > current_date - interval '30 days'
    )
  ) into result;

  return result;
end;
$$;

grant execute on function admin_get_technical_usage() to authenticated;
