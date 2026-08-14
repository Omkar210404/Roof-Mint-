import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Every page/component in this app calls createClient() independently, so
// without a shared instance the browser ends up with several concurrent
// GoTrueClient auth sessions running their own token-refresh timers. Those
// race on writing the session cookie, and the loser can leave a stale/
// invalid token behind — which is what made navigating between admin pages
// (e.g. property edit -> dashboard) intermittently look like a logout: the
// next request's session check would just fail. One shared client removes
// the race entirely.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
