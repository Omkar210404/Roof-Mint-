import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Requires the session to actually be at aal2 whenever the account has a
  // verified TOTP factor enrolled — enforced here (not just in the login
  // flow) so a stale aal1 session cookie can't reach /admin or /agent by
  // hitting the URL directly, bypassing the code-entry step client-side.
  // Accounts with no factor enrolled are unaffected (nextLevel stays aal1).
  const requireAal2 = async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return !!aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2'
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check admin role — gracefully handle missing profile
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    // If no profile exists yet (new signup), redirect to home — don't crash
    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (await requireAal2()) {
      const url = request.nextUrl.clone()
      url.pathname = '/mfa-verify'
      return NextResponse.redirect(url)
    }
  }

  // Protect agent-portal routes
  if (request.nextUrl.pathname.startsWith('/agent')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (!profile || profile.role !== 'agent') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (await requireAal2()) {
      const url = request.nextUrl.clone()
      url.pathname = '/mfa-verify'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
