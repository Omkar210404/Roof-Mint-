'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/lib/password-policy';
import { RoofmintLogo } from '@/components/roofmint-logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // null = still checking, true = a valid recovery session exists, false =
  // the link was invalid/expired/already used. Supabase's reset link can
  // land here two different ways depending on flow type — either a session
  // cookie is already set by the time we get here (code-exchange flow via
  // /auth/callback), or the client SDK parses a #access_token=...&type=
  // recovery fragment straight out of the URL on load and fires a
  // PASSWORD_RECOVERY auth event. Checking for both is what actually makes
  // this page work regardless of which one Supabase used for a given link,
  // instead of silently showing a working-looking form with no real session
  // behind it.
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !settled) {
        settled = true;
        setSessionReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        settled = true;
        setSessionReady(true);
      }
    });

    const timer = setTimeout(() => {
      if (!settled) setSessionReady(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/login'), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900 flex flex-col max-w-[480px] mx-auto w-full px-6 py-8 justify-center">
      <div className="flex justify-center mb-8">
        <RoofmintLogo width={160} height={42} className="h-10 w-auto" priority />
      </div>

      {sessionReady === null ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Verifying your reset link...</p>
        </div>
      ) : sessionReady === false ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Link Expired</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            This password reset link is invalid or has already been used. Request a new one to continue.
          </p>
          <Link href="/forgot-password" className="inline-flex h-12 px-8 bg-primary text-white font-bold rounded-xl hover:bg-teal-700 transition-colors items-center justify-center">
            Send New Link
          </Link>
        </div>
      ) : success ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Password Updated</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting you to login...</p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-navy dark:text-white mb-1">Set a new password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose a new password for your account.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reset-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2 px-1">{PASSWORD_REQUIREMENTS}</p>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
