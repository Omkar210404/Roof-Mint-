// Shared password strength rule for every place a password gets set:
// signup, password reset, Privacy & Security's "Update Password", and
// admin-issued agent passwords. This is a client-side UX check only — the
// real enforcement has to live in Supabase Auth's own password policy
// (Dashboard -> Authentication -> Policies), since signup/updateUser calls
// go straight to the Auth service and can be called directly, bypassing
// any validation that only lives in our React forms.
export const PASSWORD_REQUIREMENTS = 'At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.'

export function validatePassword(password: string): string | null {
  if (password.length < 8) return `Password must be at least 8 characters long.`
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include a number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character (e.g. ! @ # $ %).'
  return null
}
