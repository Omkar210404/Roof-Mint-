'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'

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
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  // Foreign key constraints on delete cascade will handle related records
  const { error } = await supabase.from('profiles').delete().eq('id', id)

  if (error) {
    console.error('deleteUserProfile error:', error.message)
    return { error: error.message }
  }

  return { success: true }
}

export async function updateUserRole(id: string, role: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  if (role !== 'admin' && role !== 'user') {
    return { error: 'Invalid role' }
  }

  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)

  if (error) {
    console.error('updateUserRole error:', error.message)
    return { error: error.message }
  }

  return { success: true }
}
