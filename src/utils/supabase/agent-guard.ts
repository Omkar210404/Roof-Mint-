import { createClient } from './server'

/**
 * Server-side authorization check for agent-portal Server Actions.
 * An agent must have profiles.role = 'agent' AND an agents row linked to
 * their auth user (user_id) — role alone isn't enough, since access is
 * scoped to that specific agent row's assigned properties/leads.
 */
export async function requireAgent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false as const, supabase, user: null, agent: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'agent') {
    return { authorized: false as const, supabase, user, agent: null }
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!agent) {
    return { authorized: false as const, supabase, user, agent: null }
  }

  return { authorized: true as const, supabase, user, agent }
}
