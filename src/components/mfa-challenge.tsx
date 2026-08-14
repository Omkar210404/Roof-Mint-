'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// Shown after a correct password when the account has a verified TOTP
// factor and the session is still only aal1 — completes the login by
// bumping the session to aal2. Used by both the regular /login page (for
// admin/agent accounts) since they share the same login form.
export function MfaChallenge({ factorId, onVerified }: { factorId: string; onVerified: () => void }) {
  const supabase = createClient();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError(challengeError.message);
      setBusy(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    setBusy(false);
    if (verifyError) {
      setError('That code didn\'t match. Check your authenticator app and try again.');
      return;
    }

    onVerified();
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-navy dark:text-white mb-1">Two-factor verification</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Enter the 6-digit code from your authenticator app</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="123456"
        className="w-full h-14 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />

      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="w-full py-3.5 bg-primary hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {busy ? 'Verifying...' : 'Verify & Continue'}
      </button>
    </form>
  );
}
