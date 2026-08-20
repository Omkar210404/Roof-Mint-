'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { RoofmintLogo } from '@/components/roofmint-logo';

// Shown whenever a URL matches no route at all (a typo, a stale bookmark,
// an old link to something that's since moved — e.g. the pre-restructure
// /admin/security and /admin/technical/* paths, which now 301 redirect
// instead of landing here, but anything else unmatched still will), or
// when a page explicitly calls notFound() from next/navigation (property
// edit / agent preview do this for an id that no longer exists).
export default function NotFound() {
  const [primaryAction, setPrimaryAction] = useState<{ href: string; label: string }>({ href: '/', label: 'Back to Home' });

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/technical')) setPrimaryAction({ href: '/technical', label: 'Back to Technical Panel' });
    else if (path.startsWith('/admin')) setPrimaryAction({ href: '/admin', label: 'Back to Admin Panel' });
    else if (path.startsWith('/agent')) setPrimaryAction({ href: '/agent', label: 'Back to Agent Panel' });
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-navy-900 flex flex-col items-center justify-center px-6 py-12 text-center">
      <RoofmintLogo width={160} height={44} className="h-11 w-auto mb-10" priority />

      <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-5">
        <Search className="w-7 h-7 text-primary" />
      </div>

      <p className="text-6xl font-extrabold text-navy dark:text-white leading-none">404</p>
      <h1 className="text-lg font-bold text-navy dark:text-white mt-4">This page doesn&apos;t exist</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-sm">
        The link might be old, mistyped, or the page may have moved.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-xs sm:max-w-none">
        <Link
          href={primaryAction.href}
          className="h-11 px-6 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" /> {primaryAction.label}
        </Link>
        <button
          onClick={() => window.history.back()}
          className="h-11 px-6 border border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-navy-800 text-navy dark:text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    </div>
  );
}
