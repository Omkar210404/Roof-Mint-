'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const supabase = createClient();

    // Try Supabase auth first
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // Check if user is admin or needs to complete profile
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, profile_completed')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'admin') {
        router.push('/admin');
      } else if (!profile?.profile_completed) {
        // Profile not complete → send to onboarding
        router.push('/onboarding');
      } else {
        router.push('/');
      }
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleFacebookLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900 flex flex-col max-w-[480px] md:max-w-none md:flex-row mx-auto w-full relative">
      <ThemeToggle className="absolute top-4 right-4 z-20" />
      {/* Left Side - Illustration (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 bg-white dark:bg-navy-900 flex-col items-center justify-start pt-4 lg:pt-8 px-8 lg:px-16 pb-12">
        <div className="flex flex-col items-center w-full max-w-lg">
          <Image
            src="/images/logo.png"
            alt="Roofmint"
            width={240}
            height={64}
            className="mb-12 h-16 w-auto"
            priority
          />
          <Image
            src="/images/home1.png"
            alt="Find your perfect home"
            width={500}
            height={400}
            className="w-full max-w-lg h-auto mb-8 drop-shadow-sm"
            priority
          />
          <h2 className="text-3xl font-bold text-navy dark:text-white text-center mb-4">Discover Your Dream Home</h2>
          <p className="text-gray-600 dark:text-gray-300 text-center max-w-md text-lg">AI finds. You decide. Join thousands of users finding their perfect home match.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-6 md:px-12 lg:px-24 py-8 relative">
        {/* Desktop Gradient Background for Right Side */}
        <div className="hidden md:block absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-100/60 via-teal-50/30 to-white -z-10 pointer-events-none"></div>
        
        <div className="w-full md:max-w-[420px] relative z-10 flex flex-col">
          {/* Mobile Header & Illustration (Hidden on Desktop) */}
          <div className="md:hidden text-center pb-4">
            <div className="flex justify-center mb-1">
              <Image
                src="/images/logo.png"
                alt="Roofmint"
                width={180}
                height={48}
                className="h-12 w-auto"
                priority
              />
            </div>
            <p className="text-sm font-medium text-primary">AI finds. You decide. Perfect Home.</p>
          </div>

          <div className="md:hidden flex justify-center px-8 py-2">
            <Image
              src="/images/home1.png"
              alt="Find your perfect home"
              width={320}
              height={180}
              className="w-full max-w-[280px] h-auto"
              priority
            />
          </div>

          {/* Login Form Header */}
          <div className="pt-4 md:pt-0">
            <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white mb-1 md:mb-2">Welcome back!</h1>
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-6 md:mb-8">Sign in to continue your home search</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
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

          {/* Password Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-teal-700">
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-navy-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-navy-700" />
        </div>

        {/* Social Login Buttons */}
        <div className="flex gap-3">
          <button type="button" onClick={handleGoogleLogin} className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Google</span>
          </button>
          <button type="button" onClick={handleFacebookLogin} className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Facebook</span>
          </button>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:text-teal-700">
            Sign up
          </Link>
        </p>
      </div>

          {/* Trust Badges */}
          <div className="pb-6 pt-6 md:pt-10">
            <div className="flex justify-center gap-6">
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium text-center">Verified<br />Properties</span>
              </div>
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium text-center">AI Powered<br />Search</span>
              </div>
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium text-center">Safe &<br />Trusted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
