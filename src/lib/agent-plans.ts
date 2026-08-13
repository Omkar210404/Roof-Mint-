// Single source of truth for the agent/broker plan tiers, mirrored by the
// SQL functions agent_plan_duration_months / agent_plan_lead_cap /
// agent_plan_can_export in supabase/migrations/06_agent_plan_tiers.sql —
// the SQL side is what actually enforces caps (RLS), this is for display
// and for populating the admin's plan selector. Keep both in sync by hand.

export type AgentPlanId =
  | 'trial_pack'
  | 'primary_pack'
  | 'month_pack'
  | 'priority_month_pack'
  | 'customised_pack'
  | 'yearly_partnership'

export interface AgentPlanTier {
  id: AgentPlanId
  label: string
  price: number | null // null = "As Required"
  durationMonths: number
  propertyCap: number | null // null = unlimited
  leadCap: number | null // null = unlimited
  canExport: boolean
  tagline: string
}

export const AGENT_PLANS: AgentPlanTier[] = [
  {
    id: 'trial_pack',
    label: 'Trial Pack',
    price: 2000,
    durationMonths: 1,
    propertyCap: 1,
    leadCap: 10,
    canExport: false,
    tagline: 'A simple way to start promoting a property.',
  },
  {
    id: 'primary_pack',
    label: 'Primary Pack',
    price: 3000,
    durationMonths: 1,
    propertyCap: 1,
    leadCap: 25,
    canExport: true,
    tagline: 'More lead capacity for stronger buyer reach.',
  },
  {
    id: 'month_pack',
    label: 'Month Pack',
    price: 30000,
    durationMonths: 1,
    propertyCap: 20,
    leadCap: null,
    canExport: true,
    tagline: 'Built for consistent monthly property marketing.',
  },
  {
    id: 'priority_month_pack',
    label: 'Priority Month Pack',
    price: 50000,
    durationMonths: 1,
    propertyCap: 20,
    leadCap: null,
    canExport: true,
    tagline: '24-hour priority criteria for time-sensitive campaigns.',
  },
  {
    id: 'customised_pack',
    label: 'Customised Pack',
    price: null,
    durationMonths: 1,
    propertyCap: null,
    leadCap: null,
    canExport: true,
    tagline: 'Tailored to your specific requirement. Charges as per scope.',
  },
  {
    id: 'yearly_partnership',
    label: 'Yearly Partnership',
    price: 400000,
    durationMonths: 12,
    propertyCap: null,
    leadCap: null,
    canExport: true,
    tagline: 'Everything unlimited + high priority.',
  },
]

export function getPlanTier(id: string | null | undefined): AgentPlanTier {
  return AGENT_PLANS.find(p => p.id === id) || AGENT_PLANS[0]
}

export function formatPlanPrice(price: number | null) {
  return price == null ? 'As Required' : `₹${price.toLocaleString('en-IN')}`
}

export interface PlanStatus {
  tier: AgentPlanTier
  started: boolean
  expired: boolean
  daysLeft: number | null
  endsAt: string | null
}

export function computePlanStatus(planId: string | null | undefined, startedAt: string | null | undefined): PlanStatus {
  const tier = getPlanTier(planId)
  if (!startedAt) {
    return { tier, started: false, expired: false, daysLeft: null, endsAt: null }
  }
  const end = new Date(startedAt)
  end.setMonth(end.getMonth() + tier.durationMonths)
  const msLeft = end.getTime() - Date.now()
  return {
    tier,
    started: true,
    expired: msLeft <= 0,
    daysLeft: Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))),
    endsAt: end.toISOString(),
  }
}
