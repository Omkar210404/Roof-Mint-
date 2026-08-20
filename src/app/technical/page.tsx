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
    </div>
  );
}
