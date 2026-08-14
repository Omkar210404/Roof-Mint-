'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { createServiceRoleClient } from '@/utils/supabase/service-admin'
import { logActivity } from '@/utils/supabase/activity-log'
import { validatePassword } from '@/lib/password-policy'
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
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { data: agent } = await supabase.from('agents').select('name').eq('id', id).single()

  // Nullify assigned_agent_id on properties and enquiries first if needed
  await supabase.from('properties').update({ primary_agent_id: null }).eq('primary_agent_id', id)
  await supabase.from('enquiries').update({ assigned_agent_id: null }).eq('assigned_agent_id', id)

  const { error } = await supabase.from('agents').delete().eq('id', id)

  if (error) {
    console.error('deleteAgent error:', error.message)
    return { error: error.message }
  }

  await logActivity(supabase, user!.id, 'delete_agent', 'agent', id, { name: agent?.name })

  revalidatePath('/admin/agents')
  return { success: true }
}

// ── Agent portal access (login for agents to view their own leads/listings) ─

export async function grantAgentAccess(agentId: string, email: string, password: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  if (!email) return { error: 'Email is required.' }
  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const adminClient = createServiceRoleClient()
  if (!adminClient) return { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY — cannot create portal logins.' }

  const { data: agent } = await supabase.from('agents').select('name, user_id').eq('id', agentId).single()
  if (agent?.user_id) return { error: 'This agent already has portal access. Use "Reset Password" instead.' }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: agent?.name },
  })

  if (createError || !created.user) {
    return { error: createError?.message || 'Could not create portal login.' }
  }

  const newUserId = created.user.id

  await supabase.from('profiles').update({ role: 'agent' }).eq('id', newUserId)

  const { error: linkError } = await supabase
    .from('agents')
    .update({ user_id: newUserId, email, plan: 'trial_pack', plan_started_at: new Date().toISOString() })
    .eq('id', agentId)

  if (linkError) {
    // Roll back the auth user so we don't leave an orphaned login.
    await adminClient.auth.admin.deleteUser(newUserId)
    return { error: linkError.message }
  }

  await logActivity(supabase, user!.id, 'grant_agent_access', 'agent', agentId, { email })

  revalidatePath('/admin/agents')
  return { success: true }
}

export async function resetAgentPassword(agentId: string, password: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const adminClient = createServiceRoleClient()
  if (!adminClient) return { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }

  const { data: agent } = await supabase.from('agents').select('user_id').eq('id', agentId).single()
  if (!agent?.user_id) return { error: 'This agent does not have portal access yet.' }

  const { error } = await adminClient.auth.admin.updateUserById(agent.user_id, { password })
  if (error) return { error: error.message }

  return { success: true }
}

export async function revokeAgentAccess(agentId: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { data: agent } = await supabase.from('agents').select('user_id').eq('id', agentId).single()
  if (!agent?.user_id) return { success: true }

  await supabase.from('profiles').update({ role: 'user' }).eq('id', agent.user_id)
  const { error } = await supabase.from('agents').update({ user_id: null }).eq('id', agentId)

  if (error) return { error: error.message }

  await logActivity(supabase, user!.id, 'revoke_agent_access', 'agent', agentId)

  revalidatePath('/admin/agents')
  return { success: true }
}

// ── Agent plan (one of the 6 pricing tiers) — gates what the agent portal shows ─
// Selecting any tier always (re)starts that tier's clock from now — this is
// how an admin records "I just sold/renewed them this plan."

export async function setAgentPlan(agentId: string, plan: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('agents')
    .update({ plan, plan_started_at: new Date().toISOString() })
    .eq('id', agentId)

  if (error) return { error: error.message }

  await logActivity(supabase, user!.id, 'set_agent_plan', 'agent', agentId, { plan })

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
