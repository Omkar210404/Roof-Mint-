'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { revalidatePath } from 'next/cache'

export async function createAgent(formData: FormData) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const company = formData.get('company') as string
  const commission_notes = formData.get('commission_notes') as string

  const { error } = await supabase.from('agents').insert({
    name,
    phone,
    email,
    company,
    commission_notes
  })

  if (error) {
    console.error('createAgent error:', error.message)
    return
  }

  revalidatePath('/admin/agents')
}

export async function getAgents() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []
  const { data, error } = await supabase.from('agents').select('*').order('created_at', { ascending: false })
  
  if (error) {
    console.warn('getAgents error (table may not exist yet):', error.message)
    return []
  }

  return data || []
}

export async function deleteAgent(id: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  // Nullify assigned_agent_id on properties and enquiries first if needed
  await supabase.from('properties').update({ primary_agent_id: null }).eq('primary_agent_id', id)
  await supabase.from('enquiries').update({ assigned_agent_id: null }).eq('assigned_agent_id', id)

  const { error } = await supabase.from('agents').delete().eq('id', id)

  if (error) {
    console.error('deleteAgent error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/agents')
  return { success: true }
}

export async function updateAgent(id: string, formData: FormData) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const company = formData.get('company') as string
  const commission_notes = formData.get('commission_notes') as string

  const { error } = await supabase.from('agents').update({
    name,
    phone,
    email,
    company,
    commission_notes
  }).eq('id', id)

  if (error) {
    console.error('updateAgent error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/agents')
  return { success: true }
}
