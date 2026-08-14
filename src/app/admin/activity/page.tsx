import { getActivityLog } from './actions'
import { ActivityLogClientWrapper } from './activity-client'

export default async function AdminActivityPage() {
  const log = await getActivityLog()
  return <ActivityLogClientWrapper initialLog={log} />
}
