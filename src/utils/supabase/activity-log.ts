import type { SupabaseClient } from '@supabase/supabase-js'

// activity_log already exists with RLS restricted to admin (see
// 02_security_hardening.sql) — this just standardizes writing to it.
// Fire-and-forget: a logging failure should never block the actual action.
export async function logActivity(
  supabase: SupabaseClient,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_log').insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details ?? null,
    })
  } catch (err) {
    console.warn('logActivity failed:', err)
  }
}
