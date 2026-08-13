import { getMyProperties } from '../actions'
import { AgentPropertiesClient } from './agent-properties-client'

export default async function AgentPropertiesPage() {
  const properties = await getMyProperties()

  return <AgentPropertiesClient initialProperties={properties} />
}
