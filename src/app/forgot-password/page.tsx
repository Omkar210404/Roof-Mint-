'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setIsLoading(false);

    // Always show the same success state, whether or not the email exists,
    // to avoid leaking which addresses are registered.
    if (resetError) {
      console.warn('resetPasswordForEmail error:', resetError.message);
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900 flex flex-col max-w-[480px] mx-auto w-full px-6 py-8 justify-center">
      <div className="flex justify-center mb-8">
        <Image src="/images/logo.png" alt="Roofmint" width={160} height={42} className="h-10 w-auto" priority />
      </div>

      {sent ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Check your email</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            If an account exists for <span className="font-medium text-navy dark:text-white">{email}</span>, we&apos;ve sent a link to reset your password.
          </p>
          <Link href="/login" className="inline-flex h-12 px-8 bg-primary text-white font-bold rounded-xl hover:bg-teal-700 transition-colors items-center justify-center">
            Back to Login
          </Link>
        </div>
      ) : (
        <>
          <Link href="/login" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-navy mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>

          <h1 className="text-2xl font-bold text-navy dark:text-white mb-1">Forgot Password?</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your email and we&apos;ll send you a link to reset your password.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
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
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
