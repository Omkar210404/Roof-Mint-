'use client';

import { X, Crown, Check, AlertTriangle, Clock3, Gift } from 'lucide-react';
import { formatPlanPrice, formatPlanDuration, type AgentPlanTier, type PlanStatus } from '@/lib/agent-plans';

// Presentation-only grouping, tied to the tier's stable id — price/label/
// caps stay fully admin-editable in plan_tiers, this just decides section
// headers and the small "Priority" tag.
const tierMeta: Record<string, { group: string; priority?: boolean }> = {
  trial_pack: { group: 'Starter' },
  primary_pack: { group: 'Starter' },
  month_pack: { group: 'Monthly' },
  priority_month_pack: { group: 'Monthly', priority: true },
  three_months_pack: { group: 'Multi-Month' },
  priority_three_months_pack: { group: 'Multi-Month', priority: true },
  six_months_pack: { group: 'Multi-Month' },
  priority_six_months_pack: { group: 'Multi-Month', priority: true },
  yearly_partnership: { group: 'Yearly' },
  priority_one_year_pack: { group: 'Yearly', priority: true },
  customised_pack: { group: 'Custom' },
  contract_based: { group: 'Custom' },
}

const groupOrder = ['Starter', 'Monthly', 'Multi-Month', 'Yearly', 'Custom']

export function PlansModal({ tiers, planStatus, onClose }: {
  tiers: AgentPlanTier[];
  planStatus?: PlanStatus | null;
  onClose: () => void;
}) {
  const currentPlanId = planStatus?.tier.id ?? null;

  const grouped = groupOrder
    .map(group => ({ group, items: tiers.filter(t => (tierMeta[t.id]?.group || 'Custom') === group) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-navy-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-14 px-5 border-b border-gray-100/60 dark:border-gray-800/60 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-primary" /> Partner Plans
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="p-5 pb-3">
            <div className="flex items-start gap-2.5 bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900 rounded-xl p-3">
              <Gift className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-navy dark:text-white uppercase tracking-wide">Complimentary Partner Onboarding</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your first property is listed free as a welcome benefit.</p>
              </div>
            </div>
          </div>

          {planStatus?.started && (
            <div className="mx-5 mb-4 rounded-xl border border-primary bg-teal-50/60 dark:bg-teal-950/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">Your Plan</span>
                  <span className="text-sm font-bold text-navy dark:text-white">{planStatus.tier.label}</span>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${planStatus.expired ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40'}`}>
                  {planStatus.expired ? <AlertTriangle className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                  {planStatus.expired
                    ? 'Expired'
                    : `${planStatus.daysLeft} day${planStatus.daysLeft === 1 ? '' : 's'} left`}
                </span>
              </div>
              {!planStatus.expired && planStatus.endsAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Renews or ends {new Date(planStatus.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          <div className="px-5 pb-5">
            {grouped.map(({ group, items }, gi) => (
              <div key={group} className={gi > 0 ? 'mt-5' : ''}>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{group}</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-b border-gray-100 dark:border-gray-800">
                  {items.map(tier => {
                    const isCurrent = tier.id === currentPlanId
                    const meta = tierMeta[tier.id]
                    return (
                      <div key={tier.id} className={`flex items-start justify-between gap-4 py-3 ${isCurrent ? 'bg-teal-50/40 dark:bg-teal-950/20 -mx-5 px-5' : ''}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-navy dark:text-white">{tier.label}</span>
                            {meta?.priority && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded uppercase tracking-wide">Priority</span>
                            )}
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary bg-teal-100 dark:bg-teal-900/40 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                <Check className="w-2.5 h-2.5" /> Current
                              </span>
                            )}
                          </div>
                          {tier.tagline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tier.tagline}</p>}
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                            {tier.property_cap ? `${tier.property_cap} propert${tier.property_cap === 1 ? 'y' : 'ies'}` : 'Unlimited properties'}
                            {' · '}
                            {tier.lead_cap ? `Up to ${tier.lead_cap} leads` : 'Unlimited leads'}
                            {' · '}
                            {tier.can_export ? 'Export' : 'No export'}
                            {' · '}
                            {formatPlanDuration(tier.duration_months)}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-navy dark:text-white whitespace-nowrap shrink-0 pt-0.5">{formatPlanPrice(tier.price)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center px-5 pb-5">
            To renew or move to a different plan, contact Roofmint — an admin sets this on your account.
          </p>
        </div>
      </div>
    </div>
  );
}
