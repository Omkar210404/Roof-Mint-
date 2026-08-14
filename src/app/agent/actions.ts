'use server'

import { requireAgent } from '@/utils/supabase/agent-guard'
import { logActivity } from '@/utils/supabase/activity-log'
import { revalidatePath } from 'next/cache'
import { computePlanStatus, findTier } from '@/lib/agent-plans'
import { getPlanTiers } from '../plans/actions'

export async function getMyLeads() {
  const { authorized, supabase, agent } = await requireAgent()
  if (!authorized || !agent) return []

  const { data, error } = await supabase
    .from('enquiries')
    .select(`
      *,
      property:properties(title, location_address)
    `)
    .eq('assigned_agent_id', agent.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('getMyLeads error:', error.message)
    return []
  }

  return data || []
}

export async function getMyPlanInfo() {
  const { authorized, agent } = await requireAgent()
  if (!authorized || !agent) return null

  const tiers = await getPlanTiers()
  return computePlanStatus(findTier(tiers, agent.plan), agent.plan_started_at)
}

export async function getMyAgentProfile() {
  const { authorized, agent } = await requireAgent()
  if (!authorized || !agent) return null

  return { name: agent.name as string, company: (agent.company as string) || null }
}

export async function updateMyLeadStatus(leadId: string, status: string) {
  const { authorized, supabase, user, agent } = await requireAgent()
  if (!authorized || !agent) return { error: 'Unauthorized' }

  // Belt-and-suspenders on top of RLS (enquiries_update_agent) and the
  // restrict_agent_enquiry_update trigger, which already pin this to
  // status-only changes on the agent's own rows.
  const { error } = await supabase
    .from('enquiries')
    .update({ status })
    .eq('id', leadId)
    .eq('assigned_agent_id', agent.id)

  if (error) {
    console.error('updateMyLeadStatus error:', error.message)
    return { error: error.message }
  }

  // This is the only write action an agent has, so it's the one thing
  // admin actually needs visibility into — logged under the agent's own
  // account so Admin > Activity Log shows who changed what.
  await logActivity(supabase, user!.id, 'update_lead_status', 'enquiry', leadId, { status, agent_name: agent.name })

  revalidatePath('/agent/leads')
  return { success: true }
}

export async function getMyProperties() {
  const { authorized, supabase, agent } = await requireAgent()
  if (!authorized || !agent) return []

  // Properties aren't confidential (they're public listings on the main
  // site), so the cap here is a portal display limit, not an RLS security
  // boundary — the plan's oldest N assigned properties, same "oldest first"
  // rule as the lead cap. Expired plans see nothing, matching leads.
  const tiers = await getPlanTiers()
  const status = computePlanStatus(findTier(tiers, agent.plan), agent.plan_started_at)
  if (!status.started || status.expired) return []

  let query = supabase
    .from('properties')
    .select(`
      *,
      property_media(url, is_cover)
    `)
    .eq('primary_agent_id', agent.id)
    .order('created_at', { ascending: true })

  if (status.tier.property_cap != null) {
    query = query.limit(status.tier.property_cap)
  }

  const { data, error } = await query

  if (error) {
    console.warn('getMyProperties error:', error.message)
    return []
  }

  return (data || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
