'use client';

import { useEffect, useState } from 'react';

const LAUNCH_DATE = new Date(2026, 7, 5); // August 5, 2026 — Roofmint's launch day (month is 0-indexed)

const MOTIVATIONAL_LINES = [
  'Every day live is a day closer to something great 🚀',
  'Building the future of real estate, one day at a time ✨',
  'Roofmint is growing — keep the momentum going! 🔥',
  'One more day, one more step toward the dream 🏡',
  'Small daily wins, big long-term gains 📈',
];

// Ticks every second so the clock actually feels alive, not a static
// snapshot from page load. Nothing is computed until after mount (first
// render returns null) so the server-rendered HTML and the client's first
// paint can never disagree on "what time is it" or "how many days live" —
// a plain `new Date()` evaluated during SSR would otherwise risk a
// hydration mismatch warning the moment those two clocks land on
// different seconds (or, rarely, different calendar days).
export function LaunchAnniversaryBanner() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLive = Math.floor((today.getTime() - LAUNCH_DATE.getTime()) / 86400000);

  let nextAnniversary = new Date(today.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate());
  if (nextAnniversary.getTime() < today.getTime()) {
    nextAnniversary = new Date(today.getFullYear() + 1, LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate());
  }
  const daysToAnniversary = Math.round((nextAnniversary.getTime() - today.getTime()) / 86400000);
  const yearsAtAnniversary = nextAnniversary.getFullYear() - LAUNCH_DATE.getFullYear();
  const isAnniversaryToday = daysToAnniversary === 0;

  const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateString = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const motivationalLine = MOTIVATIONAL_LINES[daysLive % MOTIVATIONAL_LINES.length];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-slate-900 to-teal-950 text-white shadow-md p-5 md:p-6">
      {/* Decorative glows */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0 text-2xl">
            🚀
          </div>
          <div>
            <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">✨ Roofmint is Live</p>
            <p className="text-2xl md:text-3xl font-extrabold leading-tight">{daysLive} day{daysLive === 1 ? '' : 's'} 🎉</p>
            <p className="text-[11px] md:text-xs text-slate-300 mt-0.5">{motivationalLine}</p>
          </div>
        </div>

        <div className="text-right">
          {isAnniversaryToday ? (
            <p className="text-sm font-bold text-teal-300">🎂 Happy Anniversary, today!</p>
          ) : (
            <>
              <p className="text-lg md:text-xl font-bold">{daysToAnniversary} day{daysToAnniversary === 1 ? '' : 's'} to go 🎯</p>
              <p className="text-[11px] text-slate-300">{yearsAtAnniversary}-year anniversary — {nextAnniversary.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </>
          )}
        </div>

        <div className="text-right border-l border-white/10 pl-4 md:pl-5">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">🕒 Right now</p>
          <p className="text-xl md:text-2xl font-mono font-bold tabular-nums">{timeString}</p>
          <p className="text-[11px] text-slate-400">{dateString}</p>
        </div>
      </div>
    </div>
  );
}
