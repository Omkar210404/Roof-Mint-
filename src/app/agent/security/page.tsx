import { MfaEnrollment } from '@/components/mfa-enrollment'

export default function AgentSecurityPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Security</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Protect your agent account with two-factor authentication</p>
      </div>
      <MfaEnrollment />
    </div>
  )
}
