import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Explicit destinations (e.g. the password-reset flow, or a property
      // page a signed-out visitor was on) are honored as-is.
      if (safeNext) {
        return NextResponse.redirect(`${origin}${safeNext}`)
      }

      // Otherwise this is an OAuth sign-in — route the same way email
      // login does: admins to /admin, incomplete profiles to /onboarding.
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, profile_completed')
          .eq('id', data.user.id)
          .single()

        if (profile?.role === 'admin') {
          return NextResponse.redirect(`${origin}/admin`)
        }
        if (!profile?.profile_completed) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}/`)
    }

    // Code exchange failed (link expired, already used, etc). If this was
    // a password-reset link, send them to /reset-password anyway rather
    // than a generic login error — that page checks for a session itself
    // and shows a proper "link expired, request a new one" state instead
    // of a dead end.
    if (safeNext) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
