import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    // 1. Get the authenticated user from the session cookie
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = user.id;

    // 2. Delete user data from all tables (cascade will handle most, but be explicit)
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('starred_properties').delete().eq('user_id', userId);
    await supabase.from('saved_searches').delete().eq('user_id', userId);
    await supabase.from('enquiries').delete().eq('user_id', userId);
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
