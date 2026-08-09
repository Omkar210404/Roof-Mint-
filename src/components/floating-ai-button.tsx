'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';

export function FloatingAIButton() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start smooth fade out at 7.5s and fully unmount/hide at 8.0s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 7500);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 8000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 transition-all duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 scale-90 pointer-events-none translate-y-3' : 'opacity-100 scale-100 translate-y-0'
      }`}
    >
      <div className="relative group">
        <Link
          href="/onboarding/ai"
          className="h-12 px-4 bg-gradient-to-r from-navy via-slate-900 to-teal-800 hover:to-teal-700 text-white font-bold text-xs md:text-sm rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 border border-teal-400/40 flex items-center gap-2 active:scale-[0.95] backdrop-blur-md"
          title="Use AI Home Matchmaker"
        >
          <div className="w-7 h-7 rounded-full bg-teal-400/20 border border-teal-400/40 flex items-center justify-center text-teal-300 group-hover:rotate-12 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-white">Ask AI</span>
          <span className="hidden sm:inline text-teal-300 font-semibold">• Match My Budget</span>
        </Link>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 text-slate-300 hover:text-white hover:bg-black flex items-center justify-center transition-colors border border-teal-400/30 shadow-sm"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
