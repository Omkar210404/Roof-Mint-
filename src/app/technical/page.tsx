import Link from 'next/link';
import { Gauge, KeyRound, ArrowRight } from 'lucide-react';
import { getTechnicalUsage } from './actions';
import { TechnicalStatCards, TechnicalUsageChart } from './technical-client';

export default async function TechnicalDashboardPage() {
  const data = await getTechnicalUsage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Technical Dashboard</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">System health, API usage, and security — separate from day-to-day business admin</p>
      </div>

      {data ? (
        <>
          <TechnicalStatCards data={data} />
          <TechnicalUsageChart data={data} />
        </>
      ) : (
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm p-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Couldn&apos;t load technical usage data.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/technical/usage"
          className="group bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm p-5 flex items-center gap-4 hover:border-primary/40 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-navy dark:text-white">Usage & Limits</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Free-tier ceilings, self-tracked API calls, rate-limit hits, and table growth</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors shrink-0" />
        </Link>

        <Link
          href="/technical/security"
          className="group bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm p-5 flex items-center gap-4 hover:border-primary/40 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-navy dark:text-white">Security</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Two-factor authentication for your admin account</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors shrink-0" />
        </Link>
      </div>
    </div>
  );
}
