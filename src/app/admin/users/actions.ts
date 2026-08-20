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

  // last_sign_in_at lives in auth.users, not profiles — merged in via a
  // SECURITY DEFINER RPC since that schema isn't otherwise queryable.
  const { data: activity } = await supabase.rpc('admin_list_auth_activity')
  const activityById = new Map((activity || []).map((a: any) => [a.id, a.last_sign_in_at]))

  // The primary admin (admin@roofmint.in) is protected at the DB level
  // (see 28_protect_primary_admin.sql) — this just lets the UI hide the
  // delete/role controls for that row instead of the action erroring out.
  const { data: primaryAdminId } = await supabase.rpc('admin_get_primary_admin_id')

  return (data || []).map(u => ({
    ...u,
    last_sign_in_at: activityById.get(u.id) || null,
    is_primary_admin: !!primaryAdminId && u.id === primaryAdminId,
  }))
}

export async function deleteUserProfile(id: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { data: target } = await supabase.from('profiles').select('full_name').eq('id', id).single()

  // activity_log.admin_id has a FK to profiles.id — deleting the actor's own
  // row first would make the log insert below fail silently (logActivity is
  // fire-and-forget), losing the audit trail for exactly the self-delete
  // case that matters most. Log first when it's a self-delete.
  if (id === user!.id) {
    await logActivity(supabase, user!.id, 'delete_user_profile', 'profile', id, { user_name: target?.full_name || 'Unknown' })
  }

  // Foreign key constraints on delete cascade will handle related records
  const { error } = await supabase.from('profiles').delete().eq('id', id)

  if (error) {
    console.error('deleteUserProfile error:', error.message)
    return { error: error.message }
  }

  if (id !== user!.id) {
    await logActivity(supabase, user!.id, 'delete_user_profile', 'profile', id, { user_name: target?.full_name || 'Unknown' })
  }

  return { success: true }
}

// activity_log only ever captured writes (role changes, deletions) — an
// admin exporting every user's name/phone/preferences to a CSV moved real
// PII out of the system and left no trace of who did it or when. This is
// the one read-only action worth auditing specifically, since it's the
// one that actually leaves the system.
export async function logDataExport(exportType: 'csv' | 'pdf', recordCount: number) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  await logActivity(supabase, user!.id, 'export_user_data', 'profile', null, {
    format: exportType,
    record_count: recordCount,
  })

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
