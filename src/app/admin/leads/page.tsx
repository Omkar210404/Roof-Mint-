import { getLeads, getAgentsList, getPropertiesList } from './actions'
import { LeadsClientWrapper } from './leads-client'

export default async function AdminLeadsPage() {
  const [dbLeads, agents, allProperties] = await Promise.all([
    getLeads(),
    getAgentsList(),
    getPropertiesList()
  ]);

  return <LeadsClientWrapper initialLeads={dbLeads} agents={agents} allProperties={allProperties} />
}
