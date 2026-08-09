import { getProperties } from './actions'
import { PropertiesClientWrapper } from './properties-client'

export default async function AdminPropertiesPage() {
  const dbProperties = await getProperties()

  return <PropertiesClientWrapper initialProperties={dbProperties} />
}
