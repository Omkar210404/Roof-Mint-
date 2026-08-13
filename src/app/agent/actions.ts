'use server'

import { requireAgent } from '@/utils/supabase/agent-guard'

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
