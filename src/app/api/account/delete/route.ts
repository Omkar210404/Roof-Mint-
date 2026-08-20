import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { isRateLimited, isSameOrigin } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // This is the one irreversible, destructive action reachable via a raw
  // API route (Server Actions get Next.js's built-in same-origin check for
  // free; plain Route Handlers like this one don't) — it had neither this
  // check nor a rate limit, so it was protected less than a chat message.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Get the authenticated user from the session cookie
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = user.id;

    // Keyed on the account itself rather than IP — this only matters once
    // authenticated, and the real threat here isn't volume, it's a single
    // unwanted cross-site-triggered request; the origin check above is the
    // main defense. This just stops a retry-loop from hammering it.
    if (isRateLimited(`account-delete:${userId}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests — please try again later.' }, { status: 429 });
    }

    // 2. Delete the user's own personal data — but NOT their enquiries.
    // Enquiries are business lead records (an agent may already be
    // actively following up on one), and every field an agent/admin needs
    // — name, phone, message, status — is captured directly on the
    // enquiry row itself, not derived from the profile. The
    // enquiries_user_id_fkey constraint is ON DELETE SET NULL, so deleting
    // the profile below automatically unlinks the enquiry from this
    // account while leaving the lead record intact.
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('starred_properties').delete().eq('user_id', userId);
    await supabase.from('saved_searches').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    // 3. Delete the auth user using service role (if available) or sign out
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      await adminClient.auth.admin.deleteUser(userId);
    }

    // 4. Sign out the user session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Account deletion error:', err);
    return NextResponse.json({ error: err.message || 'Deletion failed' }, { status: 500 });
  }
}
