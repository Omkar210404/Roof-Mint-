import { getAgents } from './actions';
import { getPlanTiers } from '../../plans/actions';
import { AgentsClientWrapper } from './agents-client';

export default async function AdminAgentsPage() {
  const [agents, planTiers] = await Promise.all([getAgents(), getPlanTiers()]);
  return <AgentsClientWrapper initialAgents={agents} initialPlanTiers={planTiers} />;
}
