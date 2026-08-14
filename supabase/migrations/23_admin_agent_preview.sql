-- ============================================================================
-- ROOFMINT — Let admin preview exactly what an agent's portal shows them
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- Admin can already read every enquiry directly (is_admin() bypasses RLS),
-- but that's not the same as seeing what a *specific agent* currently sees
-- — a lead only shows up for the agent once it's marked visible_to_agent
-- AND falls within their plan's lead cap and hasn't expired (all handled
-- by agent_lead_visible(), the same function the agent's own RLS policy
-- uses). This reuses that exact function so the preview is guaranteed to
-- match reality, rather than reimplementing the logic separately and
-- risking it drifting out of sync.
-- ============================================================================

create or replace function admin_preview_agent_leads(p_agent_id uuid)
returns setof enquiries
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
    select e.* from enquiries e
    where e.assigned_agent_id = p_agent_id
      and agent_lead_visible(e.id)
    order by e.created_at desc;
end;
$$;

grant execute on function admin_preview_agent_leads(uuid) to authenticated;
