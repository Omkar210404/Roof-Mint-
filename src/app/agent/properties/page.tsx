import { getMyProperties, getMyPlanInfo } from '../actions'
import { AgentPropertiesClient } from './agent-properties-client'

export default async function AgentPropertiesPage() {
  const [properties, plan] = await Promise.all([getMyProperties(), getMyPlanInfo()])

  return <AgentPropertiesClient initialProperties={properties} plan={plan} />
}
