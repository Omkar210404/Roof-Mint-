import { getSocialStats } from './actions'
import { SocialClientWrapper } from './social-client'

export default async function AdminSocialPage() {
  const stats = await getSocialStats()
  return <SocialClientWrapper initialStats={stats} />
}
