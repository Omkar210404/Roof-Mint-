'use server'

import { createClient } from '@/utils/supabase/server'

// Goes through a SECURITY DEFINER RPC (submit_feedback) rather than a raw
// table insert, same reasoning as the property enquiry form — no wide-open
// public insert policy, and a phone-based throttle server-side.
export async function submitFeedback(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const category = formData.get('category') as string
  const message = formData.get('message') as string

  const { error } = await supabase.rpc('submit_feedback', {
    p_name: name,
    p_phone: phone,
    p_email: email,
    p_category: category,
    p_message: message,
  })

  if (error) {
    throw new Error(error.message)
  }
}
