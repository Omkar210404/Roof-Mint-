import { getMyLeads } from '../actions'
import { AgentLeadsClient } from './agent-leads-client'

export default async function AgentLeadsPage() {
  const leads = await getMyLeads()

  return <AgentLeadsClient initialLeads={leads} />
}
