import { getAgents } from './actions';
import { AgentsClientWrapper } from './agents-client';

export default async function AdminAgentsPage() {
  const agents = await getAgents();
  return <AgentsClientWrapper initialAgents={agents} />;
}
