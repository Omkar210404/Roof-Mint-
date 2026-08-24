'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { acceptTerms } from './actions';
import { RoofmintLogo } from '@/components/roofmint-logo';

export default function AcceptTermsPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('terms_accepted_at')
        .eq('id', data.user.id)
        .single();

      // Already accepted (e.g. reached this page via a stale link) — no
      // need to show it again, move straight on.
      if (profile?.terms_accepted_at) {
        router.replace('/');
        return;
      }
      setChecking(false);
    });
  }, [router]);

  const handleContinue = async () => {
    if (!checked) return;
    setSubmitting(true);
    setError(null);

    const result = await acceptTerms();
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    // See the matching comment in (client)/layout.tsx — its terms-check
    // effect re-runs for whatever page we navigate to next and re-reads
    // terms_accepted_at fresh from the DB; if that read ever lands before
    // this write is visible, it was bouncing the user straight back here
    // right after they'd just accepted. This flag lets that check trust
    // "already handled it this session" instead of racing a second read.
    sessionStorage.setItem('roofmint_terms_accepted', '1');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from('profiles').select('profile_completed').eq('id', user.id).single()
      : { data: null };

    router.push(profile?.profile_completed === false ? '/onboarding' : '/');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900 flex flex-col items-center justify-center px-6 max-w-[480px] mx-auto">
      <Link href="/" className="mb-6">
        <RoofmintLogo width={160} height={42} className="h-10 w-auto" priority />
      </Link>

      <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-4">
        <ShieldCheck className="w-8 h-8 text-primary" />
      </div>

      <h1 className="text-xl md:text-2xl font-bold text-navy dark:text-white text-center mb-2">Before you continue</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
        Please review and accept our Terms of Use and Privacy Policy to keep using Roofmint.
      </p>

      {error && (
        <div className="mb-4 w-full p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <label className="flex items-start gap-2.5 cursor-pointer w-full mb-6 p-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800">
        <input
          id="accept-terms-checkbox"
          name="acceptTerms"
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          I agree to the{' '}
          <Link href="/profile/terms#terms-of-use" target="_blank" className="text-primary font-semibold hover:underline">
            Terms & Conditions
          </Link>{' '}
          and{' '}
          <Link href="/profile/terms#privacy-policy" target="_blank" className="text-primary font-semibold hover:underline">
            Privacy Policy
          </Link>
        </span>
      </label>

      <button
        onClick={handleContinue}
        disabled={!checked || submitting}
        className="w-full py-3.5 bg-primary hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {submitting ? 'Please wait...' : 'Continue'}
      </button>
    </div>
  );
}
