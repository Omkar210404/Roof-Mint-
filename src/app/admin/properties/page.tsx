import { getProperties, getAgentsForSelect } from './actions'
import { PropertiesClientWrapper } from './properties-client'

export default async function AdminPropertiesPage() {
  const [dbProperties, agents] = await Promise.all([getProperties(), getAgentsForSelect()])

  return <PropertiesClientWrapper initialProperties={dbProperties} agents={agents} />
}
