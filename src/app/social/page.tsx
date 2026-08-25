import { getSocialStats } from './actions'
import { SocialClientWrapper } from './social-client'

export default async function SocialPage() {
  const stats = await getSocialStats()
  return <SocialClientWrapper initialStats={stats} />
}
