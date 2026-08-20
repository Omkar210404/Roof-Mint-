import { getTechnicalUsage } from './actions';
import { TechnicalUsageClient } from './technical-client';

export default async function TechnicalUsagePage() {
  const data = await getTechnicalUsage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Technical Usage</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Free-tier limits across the services this app runs on, and what we can actually track ourselves</p>
      </div>
      <TechnicalUsageClient data={data} />
    </div>
  );
}
