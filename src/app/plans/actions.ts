'use server'

import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/utils/supabase/admin-guard'
import { revalidatePath } from 'next/cache'
import type { AgentPlanTier } from '@/lib/agent-plans'

// Plan pricing isn't confidential (it's what agents see in their own
// portal, and is meant to be shown to them), so this has no auth guard —
// plan_tiers is public-select in RLS. Only writes require admin.
export async function getPlanTiers(): Promise<AgentPlanTier[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plan_tiers')
    .select('*')
    .order('sort_order')

  if (error) {
    console.warn('getPlanTiers error:', error.message)
    return []
  }

  return data || []
}

export type PlanTierUpdate = Partial<Pick<AgentPlanTier, 'label' | 'price' | 'duration_months' | 'property_cap' | 'lead_cap' | 'can_export' | 'tagline'>>

export async function updatePlanTier(id: string, fields: PlanTierUpdate) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('plan_tiers')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/agents')
  revalidatePath('/agent/leads')
  revalidatePath('/agent/properties')
  return { success: true }
}
