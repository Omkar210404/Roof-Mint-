'use server'

import { headers } from 'next/headers'
import { isRateLimited } from '@/lib/rate-limit'

// Best-effort deterrent against a script hammering the login/signup FORM
// itself. This can't stop an attacker who calls Supabase's Auth API directly
// (bypassing our app entirely) — that requires enabling CAPTCHA in the
// Supabase Auth dashboard, which is a project setting, not app code. This
// still meaningfully raises the bar for the common case: automated abuse
// driven through the actual page.
async function checkRateLimit(prefix: string, limit: number, windowMs: number): Promise<{ limited: boolean }> {
  const hdrs = await headers()
  const forwarded = hdrs.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : hdrs.get('x-real-ip') || 'unknown'
  return { limited: isRateLimited(`${prefix}:${ip}`, limit, windowMs) }
}

export async function checkLoginRateLimit() {
  return checkRateLimit('login', 8, 5 * 60 * 1000)
}

export async function checkSignupRateLimit() {
  return checkRateLimit('signup', 5, 10 * 60 * 1000)
}

// Forgot Password had no throttle at all — resetPasswordForEmail() was
// called straight from the client with nothing in front of it, unlike
// login/signup above. That's a real harassment vector (someone can spam a
// stranger's inbox with reset-link emails) with less friction than trying
// to log in as them. Slightly stricter than signup since a successful
// submission here has a real-world side effect (an email lands in someone
// else's inbox) rather than just an attempt against your own account.
export async function checkForgotPasswordRateLimit() {
  return checkRateLimit('forgot-password', 4, 10 * 60 * 1000)
}
