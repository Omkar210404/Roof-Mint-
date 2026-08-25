'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Gauge, Video, LogOut, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { RoofmintLogo } from '@/components/roofmint-logo';

// The landing point right after an admin logs in — one login, then a
// deliberate choice between the two panels, rather than dropping straight
// into Business Admin with Technical buried in a sidebar link.
export default function AdminSelectPage() {
  const [name, setName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.href = '/login';
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', data.user.id).single();
      if (profile?.role !== 'admin') {
        window.location.href = '/login';
        return;
      }
      setName(profile.full_name || null);
      setChecking(false);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-navy-800 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-800 flex flex-col items-center justify-center px-4 py-12">
      <RoofmintLogo width={160} height={44} className="h-11 w-auto mb-8" priority />

      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">{name ? `Welcome back, ${name.split(' ')[0]}` : 'Welcome back'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Which panel do you want to work in?</p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin"
          className="group bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm hover:shadow-md hover:border-primary/40 transition-all p-6 flex flex-col"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-navy dark:text-white">Business Admin</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 flex-1">Properties, Leads, User Data, Agents, Billing, Feedback, Activity Log — day-to-day platform operations.</p>
          <span className="mt-4 text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
            Enter <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/social"
          className="group bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm hover:shadow-md hover:border-primary/40 transition-all p-6 flex flex-col"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-4">
            <Video className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-navy dark:text-white">Social Performance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 flex-1">Reels and videos across Facebook, Instagram, and YouTube — views, likes, comments, and engagement side by side.</p>
          <span className="mt-4 text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
            Enter <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        <Link
          href="/technical"
          className="group bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm hover:shadow-md hover:border-primary/40 transition-all p-6 flex flex-col"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-4">
            <Gauge className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-navy dark:text-white">Technical Panel</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 flex-1">System usage, free-tier API limits, database growth, and account security — the technical/ops side.</p>
          <span className="mt-4 text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
            Enter <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>

      <button
        onClick={handleLogout}
        className="mt-8 text-sm text-gray-400 dark:text-gray-500 hover:text-red-600 flex items-center gap-1.5 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </div>
  );
}
