'use client';

import Link from 'next/link';
import { X, LogIn } from 'lucide-react';

export function LoginPromptModal({
  open,
  onClose,
  title = 'Login to Continue',
  message = 'Create a free account or log in to enquire, save properties, and get personalized AI matches.',
  returnTo,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  // Path to return to after login (e.g. the property page that triggered
  // this prompt), so logging in doesn't strand the user back on Home.
  returnTo?: string;
}) {
  if (!open) return null;

  const loginHref = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login';

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white dark:bg-navy-900 rounded-t-2xl md:rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 p-1"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mx-auto">
          <LogIn className="w-7 h-7 text-primary" />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-navy dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href={loginHref}
            onClick={onClose}
            className="w-full h-11 flex items-center justify-center bg-primary hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            onClick={onClose}
            className="w-full h-11 flex items-center justify-center border border-gray-200/60 dark:border-gray-800/60 text-navy dark:text-white font-semibold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
          >
            Create an account
          </Link>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 text-center pt-1"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
