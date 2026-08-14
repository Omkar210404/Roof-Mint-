'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { logActivity } from '@/utils/supabase/activity-log'
import { revalidatePath } from 'next/cache'

export async function getFeedback() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('getFeedback error:', error.message)
    return []
  }

  return data || []
}

export async function updateFeedbackStatus(id: string, status: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('feedback')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('updateFeedbackStatus error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/feedback')
  return { success: true }
}

export async function deleteFeedback(id: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase.from('feedback').delete().eq('id', id)

  if (error) {
    console.error('deleteFeedback error:', error.message)
    return { error: error.message }
  }

  await logActivity(supabase, user!.id, 'delete_feedback', 'feedback', id)

  revalidatePath('/admin/feedback')
  return { success: true }
}
