import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client for operations that must bypass RLS and use the
 * Supabase Auth Admin API (creating/updating auth users directly, without
 * going through signUp/signIn). Never expose this client or its key to the
 * browser — server-only (Server Actions / Route Handlers).
 */
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
