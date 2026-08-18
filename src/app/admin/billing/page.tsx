import { getBills, getAgentsForBilling } from './actions'
import { BillingClientWrapper } from './billing-client'

export default async function AdminBillingPage() {
  const [bills, agents] = await Promise.all([getBills(), getAgentsForBilling()])

  return <BillingClientWrapper initialBills={bills} agents={agents} />
}
