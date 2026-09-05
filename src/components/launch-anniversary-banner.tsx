'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getFinancialSummary } from '@/app/admin/financial/actions';

const LAUNCH_DATE = new Date(2026, 7, 5); // August 5, 2026 — Roofmint's launch day (month is 0-indexed)

const MOTIVATIONAL_LINES = [
  'Every day live is a day closer to something great 🚀',
  'Building the future of real estate, one day at a time ✨',
  'Roofmint is growing — keep the momentum going! 🔥',
  'One more day, one more step toward the dream 🏡',
  'Small daily wins, big long-term gains 📈',
];

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 md:w-14 rounded-lg bg-white/10 border border-white/10 py-1.5 text-center">
        <span className="text-lg md:text-xl font-mono font-bold tabular-nums">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-[9px] text-slate-400 uppercase tracking-wide mt-1">{label}</span>
    </div>
  );
}

// Ticks every second so the countdown actually feels alive, not a static
// snapshot from page load. Nothing is computed until after mount (first
// render returns null) so the server-rendered HTML and the client's first
// paint can never disagree on "how many days live" or "time to next
// anniversary" — a plain `new Date()` evaluated during SSR would otherwise
// risk a hydration mismatch warning the moment those two clocks land on
// different seconds (or, rarely, different calendar days).
export function LaunchAnniversaryBanner() {
  const [now, setNow] = useState<Date | null>(null);

  // Financial summary — connected to the Financial Board below. The board
  // dispatches a custom window event whenever its data changes (add/edit/
  // delete or realtime), and this banner listens to stay in sync.
  const [financial, setFinancial] = useState<{ net: number; totalIncome: number; totalExpense: number } | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);

    // Fetch the financial summary from the server on mount
    getFinancialSummary().then(summary => {
      setFinancial({ net: summary.net, totalIncome: summary.totalIncome, totalExpense: summary.totalExpense });
    });

    // Listen for financial summary updates from the FinancialBoard component
    const handleFinancialUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setFinancial({ net: detail.net, totalIncome: detail.totalIncome, totalExpense: detail.totalExpense });
      }
    };

    window.addEventListener('financial-summary-updated', handleFinancialUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener('financial-summary-updated', handleFinancialUpdate);
    };
  }, []);

  if (!now) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLive = Math.floor((today.getTime() - LAUNCH_DATE.getTime()) / 86400000);

  let nextAnniversary = new Date(today.getFullYear(), LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate());
  if (nextAnniversary.getTime() < today.getTime()) {
    nextAnniversary = new Date(today.getFullYear() + 1, LAUNCH_DATE.getMonth(), LAUNCH_DATE.getDate());
  }
  const yearsAtAnniversary = nextAnniversary.getFullYear() - LAUNCH_DATE.getFullYear();
  const isAnniversaryToday = nextAnniversary.getTime() === today.getTime();

  const remainingMs = Math.max(0, nextAnniversary.getTime() - now.getTime());
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const countdown = {
    days: Math.floor(remainingSeconds / 86400),
    hours: Math.floor((remainingSeconds % 86400) / 3600),
    minutes: Math.floor((remainingSeconds % 3600) / 60),
    seconds: remainingSeconds % 60,
  };

  const motivationalLine = MOTIVATIONAL_LINES[daysLive % MOTIVATIONAL_LINES.length];

  const isProfit = (financial?.net ?? 0) >= 0;
  const moneyDisplay = financial
    ? `₹${Math.abs(financial.net).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '₹0';

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

        <div className="flex flex-wrap items-center gap-6 lg:gap-10">
          {/* Money Earned — connected to the Financial Board */}
          <div className="flex flex-col items-end border-r border-white/10 pr-6 lg:pr-10">
            <div className="text-right">
              <p className="text-[10px] text-teal-300 uppercase tracking-wide mb-0.5">Money Earned</p>
              <div className="flex items-center gap-1.5 justify-end">
                <p className={`text-xl font-bold leading-none ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                  {isProfit ? '+' : '−'}{moneyDisplay}
                </p>
                {isProfit ? (
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
              </div>
              {financial && (
                <p className="text-[9px] text-slate-400 mt-1">
                  {isProfit ? 'In profit' : 'Net loss'} · Income ₹{financial.totalIncome.toLocaleString('en-IN')} · Expenses ₹{financial.totalExpense.toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>

          {/* Anniversary Countdown */}
          {isAnniversaryToday ? (
            <p className="text-sm font-bold text-teal-300">🎂 Happy Anniversary, today!</p>
          ) : (
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">🎯 {yearsAtAnniversary}-year anniversary in</p>
              <div className="flex items-center gap-1.5 md:gap-2">
                <TimeBox value={countdown.days} label="days" />
                <span className="text-white/30 font-bold pb-4">:</span>
                <TimeBox value={countdown.hours} label="hrs" />
                <span className="text-white/30 font-bold pb-4">:</span>
                <TimeBox value={countdown.minutes} label="min" />
                <span className="text-white/30 font-bold pb-4">:</span>
                <TimeBox value={countdown.seconds} label="sec" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}