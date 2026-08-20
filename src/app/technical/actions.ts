'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'

export async function getTechnicalUsage() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return null

  const { data, error } = await supabase.rpc('admin_get_technical_usage')

  if (error) {
    console.error('getTechnicalUsage error:', error.message)
    return null
  }

  return data as {
    db_size_bytes: number
    row_counts: Record<string, number>
    daily_usage: { day: string; metric: string; count: number }[]
  }
}
