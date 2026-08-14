'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { logActivity } from '@/utils/supabase/activity-log'

export async function getUserProfiles() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      phone,
      role,
      pref_budget_min,
      pref_budget_max,
      pref_location,
      pref_bhk,
      pref_property_type,
      pref_furnishing,
      pref_timeline,
      pref_amenities,
      pref_notes,
      profile_completed,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getUserProfiles error:', error.message)
    return []
  }

  return data || []
}

export async function deleteUserProfile(id: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { data: target } = await supabase.from('profiles').select('full_name').eq('id', id).single()

  // Foreign key constraints on delete cascade will handle related records
  const { error } = await supabase.from('profiles').delete().eq('id', id)

  if (error) {
    console.error('deleteUserProfile error:', error.message)
    return { error: error.message }
  }

  await logActivity(supabase, user!.id, 'delete_user_profile', 'profile', id, { user_name: target?.full_name || 'Unknown' })

  return { success: true }
}

export async function updateUserRole(id: string, role: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  if (role !== 'admin' && role !== 'user') {
    return { error: 'Invalid role' }
  }

  const { data: target } = await supabase.from('profiles').select('full_name, role').eq('id', id).single()

  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)

  if (error) {
    console.error('updateUserRole error:', error.message)
    return { error: error.message }
  }

  await logActivity(supabase, user!.id, 'update_user_role', 'profile', id, {
    user_name: target?.full_name || 'Unknown',
    from: target?.role || 'user',
    to: role,
  })

  return { success: true }
}
