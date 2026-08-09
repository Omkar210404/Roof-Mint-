import { createClient } from './server'

/**
 * Server-side authorization check for admin-only Server Actions.
 * Server Actions are independently invocable POST endpoints, so they must not
 * rely solely on middleware route-matching or client-side routing for protection.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false as const, supabase, user: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { authorized: false as const, supabase, user }
  }

  return { authorized: true as const, supabase, user }
}
