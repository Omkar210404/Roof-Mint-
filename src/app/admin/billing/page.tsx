import { getBills, getAgentsForBilling } from './actions'
import { getPlanTiers } from '../../plans/actions'
import { BillingClientWrapper } from './billing-client'

export default async function AdminBillingPage() {
  const [bills, agents, planTiers] = await Promise.all([getBills(), getAgentsForBilling(), getPlanTiers()])

  return <BillingClientWrapper initialBills={bills} agents={agents} planTiers={planTiers} />
}
