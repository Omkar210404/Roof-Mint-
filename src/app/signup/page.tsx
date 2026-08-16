'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, User, Phone, Shield, Sparkles, CheckCircle, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/lib/password-policy';
import { RoofmintLogo } from '@/components/roofmint-logo';
import { HomeSearchIllustration } from '@/components/home-search-illustration';

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          phone: formData.mobile,
        },
      },
    });

    if (signUpError) {
      if (signUpError.status === 429 || signUpError.message.toLowerCase().includes('rate limit') || signUpError.message.includes('429')) {
        setError('Supabase Email Rate Limit Exceeded (429 Too Many Requests). Please wait 5 minutes, or turn off Email Confirmation in Supabase Dashboard → Auth → Providers → Email.');
      } else {
        setError(signUpError.message);
      }
      setIsLoading(false);
      return;
    }

    // Ensure profile record exists (a DB trigger also provisions this row on
    // signup so it works even before email confirmation; this is a best-effort
    // sync in case a session is already active). terms_accepted_at is set
    // here since this form already required checking the terms box above —
    // Google sign-ins skip this form entirely and get the /accept-terms
    // gate instead.
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: formData.fullName,
        phone: formData.mobile,
        profile_completed: false,
        terms_accepted_at: new Date().toISOString(),
      });
    }

    setIsLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-navy-900 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">Account Created!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Let&apos;s set up your preferences so we can find your dream home.</p>
          <Link href="/onboarding" className="inline-flex h-12 px-8 bg-primary text-white font-bold rounded-xl hover:bg-teal-700 transition-colors items-center justify-center">
            Complete Your Profile →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900 flex flex-col max-w-[480px] md:max-w-none md:flex-row mx-auto w-full relative">
      <ThemeToggle className="absolute top-4 right-4 z-20" />
      <Link
        href="/"
        title="Back to home"
        className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-gray-50 dark:bg-navy-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-700 transition-colors"
      >
        <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </Link>
      {/* Left Side - Illustration (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 bg-white dark:bg-navy-900 flex-col items-center justify-start pt-4 lg:pt-8 px-8 lg:px-16 pb-12">
        <div className="flex flex-col items-center w-full max-w-lg">
          <Link href="/">
            <RoofmintLogo width={240} height={64} className="mb-12 h-16 w-auto" priority />
          </Link>
          <HomeSearchIllustration width={500} height={400} className="w-full max-w-lg h-auto mb-8 drop-shadow-sm" priority />
          <h2 className="text-3xl font-bold text-navy dark:text-white text-center mb-4">Start Your Journey</h2>
          <p className="text-gray-600 dark:text-gray-300 text-center max-w-md text-lg">Create an account to save favorite properties, get personalized AI recommendations, and connect with top builders.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-6 md:px-12 lg:px-24 py-8 relative">
        {/* Desktop Gradient Background */}
        <div className="hidden md:block absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-100/60 via-teal-50/30 to-white -z-10 pointer-events-none"></div>
        
        <div className="w-full md:max-w-[420px] relative z-10 flex flex-col">
          {/* Mobile Header */}
          <div className="md:hidden text-center pb-4">
            <div className="flex justify-center mb-1">
              <Link href="/">
                <RoofmintLogo width={160} height={42} className="h-10 w-auto" priority />
              </Link>
            </div>
            <p className="text-xs font-medium text-primary">AI finds. You decide. Perfect Home.</p>
          </div>

          {/* Form Header */}
          <div className="pt-4 md:pt-0">
            <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white mb-1 md:mb-2">Create your account</h1>
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-5 md:mb-8">Start your journey to find the perfect home</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text" name="fullName" placeholder="Full Name" value={formData.fullName}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
              required
            />
          </div>

          {/* Email */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email" name="email" placeholder="Email address" value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
              required
            />
          </div>

          {/* Mobile */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel" name="mobile" placeholder="Mobile number" value={formData.mobile}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"} name="password" placeholder="Password"
              value={formData.password} onChange={handleChange}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
              required minLength={8}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2.5 px-1">{PASSWORD_REQUIREMENTS}</p>

          {/* Confirm Password */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password"
              value={formData.confirmPassword} onChange={handleChange}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
              required
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600">
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Terms Checkbox */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              I agree to the <Link href="/profile/terms" className="text-primary font-medium">Terms of Service</Link> and{" "}
              <Link href="/profile/terms" className="text-primary font-medium">Privacy Policy</Link>
            </span>
          </label>

          {/* Sign Up Button */}
          <button
            type="submit" disabled={isLoading || !formData.agreeTerms}
            className="w-full py-3.5 bg-primary hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-navy-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-navy-700" />
        </div>

        {/* Social Buttons */}
        <div className="flex gap-3">
          <button type="button" onClick={handleGoogleLogin} className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200/60 dark:border-gray-800/60 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Continue with Google</span>
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5 mb-4">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-teal-700">Login</Link>
        </p>
      </div>

          {/* Trust Badges */}
          <div className="pb-6 pt-4 md:pt-8">
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
