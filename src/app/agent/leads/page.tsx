import { getMyLeads, getMyPlanInfo } from '../actions'
import { AgentLeadsClient } from './agent-leads-client'

export default async function AgentLeadsPage() {
  const [leads, plan] = await Promise.all([getMyLeads(), getMyPlanInfo()])

  return <AgentLeadsClient initialLeads={leads} plan={plan} />
}
