import { getSocialStats } from './actions'
import { SocialClientWrapper } from './social-client'
import { LaunchAnniversaryBanner } from '@/components/launch-anniversary-banner'

export default async function SocialPage() {
  const stats = await getSocialStats()
  return (
    <div className="space-y-6">
      <LaunchAnniversaryBanner />
      <SocialClientWrapper initialStats={stats} />
    </div>
  )
}
