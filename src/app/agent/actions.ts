'use server'

import { requireAgent } from '@/utils/supabase/agent-guard'
import { revalidatePath } from 'next/cache'

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

  const plan: 'trial' | 'paid' = agent.plan || 'trial'
  let trialEndsAt: string | null = null
  let trialExpired = false
  let daysLeft: number | null = null

  if (plan === 'trial' && agent.trial_started_at) {
    const end = new Date(agent.trial_started_at)
    end.setMonth(end.getMonth() + 1)
    trialEndsAt = end.toISOString()
    const msLeft = end.getTime() - Date.now()
    trialExpired = msLeft <= 0
    daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  }

  return { plan, trialEndsAt, trialExpired, daysLeft }
}

export async function updateMyLeadStatus(leadId: string, status: string) {
  const { authorized, supabase, agent } = await requireAgent()
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

  revalidatePath('/agent/leads')
  return { success: true }
}

export async function getMyProperties() {
  const { authorized, supabase, agent } = await requireAgent()
  if (!authorized || !agent) return []

  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      property_media(url, is_cover)
    `)
    .eq('primary_agent_id', agent.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('getMyProperties error:', error.message)
    return []
  }

  return data || []
}
