'use client';

import Link from 'next/link';
import { LogIn, Lock } from 'lucide-react';

export function RequireLoginGate({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm p-8">
        <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/40 text-primary flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-navy dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 mb-5">{message}</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 h-10 px-5 bg-primary hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <LogIn className="w-4 h-4" /> Log In
        </Link>
      </div>
    </div>
  );
}
