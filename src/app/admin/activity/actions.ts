'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'

export async function getActivityLog() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []

  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      actor:profiles(full_name, role)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.warn('getActivityLog error:', error.message)
    return []
  }

  return data || []
}
