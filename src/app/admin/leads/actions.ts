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

export async function getPropertiesList() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []
  const { data } = await supabase.from('properties').select('id, title').order('title')
  return data || []
}

export async function createManualLead(formData: FormData) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const name = (formData.get('name') as string || '').trim()
  const phone = (formData.get('phone') as string || '').trim()
  const email = (formData.get('email') as string || '').trim()
  const property_id = (formData.get('property_id') as string) || null
  const budget_hint = (formData.get('budget_hint') as string || '').trim()
  const message = (formData.get('message') as string || '').trim()
  const status = (formData.get('status') as string) || 'new'
  const assigned_agent_id = (formData.get('assigned_agent_id') as string) || null

  if (!name || !phone) {
    return { error: 'Name and phone are required.' }
  }

  // user_id stays null — this lead has no linked client account, same as
  // any guest who submits the public enquiry form without logging in.
  const { error } = await supabase.from('enquiries').insert({
    name,
    phone,
    email: email || null,
    property_id: property_id || null,
    budget_hint: budget_hint || null,
    message: message || null,
    status,
    assigned_agent_id: assigned_agent_id || null,
    user_id: null,
    source: 'manual',
  })

  if (error) {
    console.error('createManualLead error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/leads')
  return { success: true }
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

export async function setLeadAgentVisibility(id: string, visible: boolean) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('enquiries')
    .update({ visible_to_agent: visible })
    .eq('id', id)

  if (error) {
    console.error('setLeadAgentVisibility error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/leads')
  return { success: true }
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
