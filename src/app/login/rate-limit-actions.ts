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
