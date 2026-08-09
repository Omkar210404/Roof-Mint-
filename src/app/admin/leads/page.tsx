import { getLeads, getAgentsList } from './actions'
import { LeadsClientWrapper } from './leads-client'

export default async function AdminLeadsPage() {
  const [dbLeads, agents] = await Promise.all([
    getLeads(),
    getAgentsList()
  ]);

  return <LeadsClientWrapper initialLeads={dbLeads} agents={agents} />
}
