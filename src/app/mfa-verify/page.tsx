'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { MfaChallenge } from '@/components/mfa-challenge';
import { RoofmintLogo } from '@/components/roofmint-logo';

// Landing point when proxy.ts finds a valid aal1 session on an account
// that has 2FA enabled, trying to reach a protected admin/agent route —
// rather than forcing a full password re-entry (the session cookie is
// still perfectly valid), this only asks for the missing second factor.
export default function MfaVerifyPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const routeByRole = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') router.replace('/admin');
    else if (profile?.role === 'agent') router.replace('/agent');
    else router.replace('/');
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aal || aal.nextLevel !== 'aal2' || aal.currentLevel === 'aal2') {
        // Nothing to verify (2FA not enabled, or already at aal2) — just
        // continue on to wherever this account belongs.
        await routeByRole();
        return;
      }

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');
      if (!totpFactor) {
        await routeByRole();
        return;
      }

      setFactorId(totpFactor.id);
      setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900 flex flex-col items-center justify-center px-6 max-w-[480px] mx-auto">
      <Link href="/" className="mb-8">
        <RoofmintLogo width={160} height={42} className="h-10 w-auto" priority />
      </Link>
      <div className="w-full">
        {factorId && <MfaChallenge factorId={factorId} onVerified={routeByRole} />}
      </div>
    </div>
  );
}
