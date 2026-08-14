'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { computePlanStatus, findTier } from '@/lib/agent-plans'
import { getPlanTiers } from '../../plans/actions'

// Everything here is read-only and mirrors exactly what the agent
// themselves would see in their own portal — reusing the same
// admin_preview_agent_leads() RPC the agent's own RLS policy is built on
// for leads, and the same plan-cap logic as getMyProperties for listings,
// so this can't drift out of sync with the real thing.
export async function getAgentPreview(agentId: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return null

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, company, plan, plan_started_at, user_id')
    .eq('id', agentId)
    .single()

  if (!agent) return null

  const tiers = await getPlanTiers()
  const planStatus = computePlanStatus(findTier(tiers, agent.plan), agent.plan_started_at)

  const { data: leads, error: leadsError } = await supabase.rpc('admin_preview_agent_leads', { p_agent_id: agentId })
  if (leadsError) console.warn('getAgentPreview leads error:', leadsError.message)

  let properties: any[] = []
  if (planStatus.started && !planStatus.expired) {
    let query = supabase
      .from('properties')
      .select('id, title, slug, status, price, city, locality, property_media(url, is_cover)')
      .eq('primary_agent_id', agentId)
      .order('created_at', { ascending: true })

    if (planStatus.tier.property_cap != null) {
      query = query.limit(planStatus.tier.property_cap)
    }

    const { data: propsData, error: propsError } = await query
    if (propsError) console.warn('getAgentPreview properties error:', propsError.message)
    properties = propsData || []
  }

  return {
    agent: { name: agent.name as string, company: agent.company as string | null, hasPortalAccess: !!agent.user_id },
    planStatus,
    leads: leads || [],
    properties,
  }
}
