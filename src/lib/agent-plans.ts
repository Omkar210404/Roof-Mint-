// Shared types/helpers for agent plan tiers. The tiers themselves now live
// in the `plan_tiers` table (see supabase/migrations/07_plan_tiers_table.sql)
// and are admin-editable — this file no longer hardcodes them, it just
// knows how to read a tier object and compute plan status from it.

export interface AgentPlanTier {
  id: string
  label: string
  price: number | null // null = "As Required"
  duration_months: number
  property_cap: number | null // null = unlimited
  lead_cap: number | null // null = unlimited
  can_export: boolean
  tagline: string | null
  sort_order: number
}

const FALLBACK_TIER: AgentPlanTier = {
  id: 'unknown',
  label: 'No Plan Set',
  price: null,
  duration_months: 1,
  property_cap: 0,
  lead_cap: 0,
  can_export: false,
  tagline: null,
  sort_order: 0,
}

export function findTier(tiers: AgentPlanTier[], id: string | null | undefined): AgentPlanTier {
  return tiers.find(t => t.id === id) || FALLBACK_TIER
}

export function formatPlanPrice(price: number | null) {
  return price == null ? 'As Required' : `₹${price.toLocaleString('en-IN')}`
}

export function formatPlanDuration(months: number) {
  if (months === 12) return '1 year'
  if (months === 1) return '1 month'
  return `${months} months`
}

export interface PlanStatus {
  tier: AgentPlanTier
  started: boolean
  expired: boolean
  daysLeft: number | null
  endsAt: string | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

// A "month" here is always exactly 30 days, not calendar-month arithmetic
// (which would otherwise silently vary between 28 and 31 days depending on
// the start date) — so every plan period is predictable and identical
// regardless of when it was granted.
export function computePlanStatus(tier: AgentPlanTier | null | undefined, startedAt: string | null | undefined): PlanStatus {
  const resolvedTier = tier || FALLBACK_TIER
  if (!startedAt) {
    return { tier: resolvedTier, started: false, expired: false, daysLeft: null, endsAt: null }
  }
  const end = new Date(new Date(startedAt).getTime() + resolvedTier.duration_months * 30 * MS_PER_DAY)
  const msLeft = end.getTime() - Date.now()
  return {
    tier: resolvedTier,
    started: true,
    expired: msLeft <= 0,
    daysLeft: Math.max(0, Math.ceil(msLeft / MS_PER_DAY)),
    endsAt: end.toISOString(),
  }
}
