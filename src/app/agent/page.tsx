import { getMyLeads, getMyProperties, getMyPlanInfo, getMyAgentProfile } from './actions'
import { AgentDashboardClient } from './dashboard-client'

export default async function AgentDashboardPage() {
  const [leads, properties, plan, profile] = await Promise.all([
    getMyLeads(),
    getMyProperties(),
    getMyPlanInfo(),
    getMyAgentProfile(),
  ])

  return <AgentDashboardClient leads={leads} properties={properties} plan={plan} profile={profile} />
}
