'use server'

import { createClient } from '@/utils/supabase/server'

// "Rate the App" — goes through the same submit_feedback RPC as Help &
// Support messages (own table, phone-based throttle, admin-only RLS), just
// tagged with category 'App Rating' and a star rating attached.
export async function submitAppRating(rating: number, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single()

  const { error } = await supabase.rpc('submit_feedback', {
    p_name: profile?.full_name || 'Roofmint User',
    p_phone: profile?.phone || 'N/A',
    p_email: user.email || '',
    p_category: 'App Rating',
    p_message: note.trim() || `Rated the app ${rating} star${rating === 1 ? '' : 's'} with no additional comments.`,
    p_rating: rating,
  })

  if (error) return { error: error.message }
  return { success: true }
}
