'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { revalidatePath } from 'next/cache'

export async function sendNotificationToUser(userId: string, type: string, message: string, propertyId?: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: type || 'system',
    message: message.trim(),
    property_id: propertyId || null,
    is_read: false
  })

  if (error) {
    console.error('sendNotificationToUser error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/notifications')
  revalidatePath('/profile/notifications')
  return { success: true }
}

export async function broadcastNotificationToAll(type: string, message: string, propertyId?: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  // Fetch all user profile IDs
  const { data: users, error: userError } = await supabase.from('profiles').select('id')

  if (userError || !users || users.length === 0) {
    return { error: 'No active user profiles found to send notification.' }
  }

  const notificationRows = users.map(u => ({
    user_id: u.id,
    type: type || 'system',
    message: message.trim(),
    property_id: propertyId || null,
    is_read: false
  }))

  const { error } = await supabase.from('notifications').insert(notificationRows)

  if (error) {
    console.error('broadcastNotificationToAll error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/notifications')
  revalidatePath('/profile/notifications')
  return { success: true, count: users.length }
}

export async function getAdminNotificationsLog() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      user:profiles(full_name, phone),
      property:properties(title, slug)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('getAdminNotificationsLog error:', error.message)
    return []
  }

  return data || []
}

export async function getUsersAndPropertiesForSelect() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { users: [], properties: [] }

  const { data: users } = await supabase.from('profiles').select('id, full_name, phone').order('created_at', { ascending: false })
  const { data: properties } = await supabase.from('properties').select('id, title, slug').order('title')

  return {
    users: users || [],
    properties: properties || []
  }
}

export async function deleteNotificationLog(id: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase.from('notifications').delete().eq('id', id)

  if (error) {
    console.error('deleteNotificationLog error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/notifications')
  revalidatePath('/profile/notifications')
  return { success: true }
}
