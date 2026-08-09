'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { revalidatePath } from 'next/cache'

export async function getLeads() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []
  const { data, error } = await supabase
    .from('enquiries')
    .select(`
      *,
      assigned_agent:agents!enquiries_assigned_agent_id_fkey(id, name, phone),
      property:properties(
        title, 
        location_address, 
        primary_agent:agents(id, name, phone)
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.warn('getLeads error:', error.message)
    return []
  }

  return data || []
}

export async function getAgentsList() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []
  const { data } = await supabase.from('agents').select('id, name, company').order('name')
  return data || []
}

export async function updateLeadStatus(id: string, status: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return
  const { error } = await supabase
    .from('enquiries')
    .update({ status })
    .eq('id', id)
    
  if (error) {
    console.error('updateLeadStatus error:', error.message)
    return
  }
  
  revalidatePath('/admin/leads')
}

export async function assignLeadAgent(leadId: string, agentId: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return
  const { error } = await supabase
    .from('enquiries')
    .update({ assigned_agent_id: agentId || null })
    .eq('id', leadId)

  if (error) {
    console.error('assignLeadAgent error:', error.message)
    return
  }

  revalidatePath('/admin/leads')
}

export async function deleteLead(id: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase.from('enquiries').delete().eq('id', id)

  if (error) {
    console.error('deleteLead error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/leads')
  return { success: true }
}
