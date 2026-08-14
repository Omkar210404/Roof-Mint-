'use client';

import { useState } from 'react';
import { X, Crown, Check, AlertTriangle, Clock3, Gift, Star } from 'lucide-react';
import { formatPlanPrice, formatPlanDuration, type AgentPlanTier, type PlanStatus } from '@/lib/agent-plans';

// Visual grouping is a presentation concern tied to the tier's stable id —
// price/label/caps stay fully admin-editable in plan_tiers, this just
// decides how each tier LOOKS (badge color/size, short code, priority star).
const badgeMeta: Record<string, { short: string; group: 'starter' | 'monthly' | 'multi' | 'yearly' | 'custom'; priority?: boolean }> = {
  trial_pack: { short: 'T', group: 'starter' },
  primary_pack: { short: 'P', group: 'starter' },
  month_pack: { short: 'M', group: 'monthly' },
  priority_month_pack: { short: 'M', group: 'monthly', priority: true },
  three_months_pack: { short: '3M', group: 'multi' },
  priority_three_months_pack: { short: '3M', group: 'multi', priority: true },
  six_months_pack: { short: '6M', group: 'multi' },
  priority_six_months_pack: { short: '6M', group: 'multi', priority: true },
  yearly_partnership: { short: '1Y', group: 'yearly' },
  priority_one_year_pack: { short: '1Y', group: 'yearly', priority: true },
  customised_pack: { short: 'C', group: 'custom' },
  contract_based: { short: 'CB', group: 'custom' },
}

const groupBadgeStyle: Record<string, string> = {
  starter: 'w-12 h-12 text-sm bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400',
  monthly: 'w-14 h-14 text-base bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-md shadow-teal-500/20',
  multi: 'w-14 h-14 text-base bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-blue-500/20',
  yearly: 'w-16 h-16 text-lg bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-lg shadow-amber-500/30',
  custom: 'w-12 h-12 text-xs border-2 border-dashed border-gray-300 dark:border-gray-700 bg-transparent text-gray-500 dark:text-gray-400',
}

const groupLabel: Record<string, string> = {
  starter: 'Starter',
  monthly: 'Monthly',
  multi: 'Multi-Month',
  yearly: 'Yearly',
  custom: 'Custom',
}

const groupOrder = ['starter', 'monthly', 'multi', 'yearly', 'custom']

export function PlansModal({ tiers, planStatus, onClose }: {
  tiers: AgentPlanTier[];
  planStatus?: PlanStatus | null;
  onClose: () => void;
}) {
  const currentPlanId = planStatus?.tier.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(currentPlanId);
  const selectedTier = tiers.find(t => t.id === selectedId) || null;

  const grouped = groupOrder
    .map(group => ({ group, items: tiers.filter(t => (badgeMeta[t.id]?.group || 'custom') === group) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-navy-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
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

        <div className="overflow-y-auto p-5 space-y-5">
          <div className="flex items-start gap-2.5 bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900 rounded-xl p-3">
            <Gift className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-navy dark:text-white uppercase tracking-wide">Complimentary Partner Onboarding</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your first property is listed free as a welcome benefit.</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Tap a plan to see its details</p>

          {/* Badge picker, grouped starter → monthly → multi-month → yearly → custom */}
          <div className="space-y-4">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{groupLabel[group]}</p>
                <div className="flex flex-wrap gap-3">
                  {items.map(tier => {
                    const meta = badgeMeta[tier.id] || { short: tier.label.slice(0, 2).toUpperCase(), group: 'custom' as const }
                    const isCurrent = tier.id === currentPlanId
                    const isSelected = tier.id === selectedId
                    return (
                      <button
                        key={tier.id}
                        onClick={() => setSelectedId(tier.id)}
                        className="flex flex-col items-center gap-1 w-16"
                        title={tier.label}
                      >
                        <div className="relative">
                          <div className={`rounded-full flex items-center justify-center font-extrabold transition-all ${groupBadgeStyle[meta.group]} ${isSelected ? 'ring-4 ring-primary/40 scale-105' : ''} ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-navy-900 ring-green-500' : ''}`}>
                            {meta.short}
                          </div>
                          {meta.priority && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-navy-900 shadow flex items-center justify-center">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            </span>
                          )}
                          {isCurrent && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 shadow flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight">{tier.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel for whichever badge is selected */}
          {selectedTier && (
            <div className={`rounded-xl p-4 border ${selectedTier.id === currentPlanId ? 'border-primary bg-teal-50/60 dark:bg-teal-950/20' : 'border-gray-100/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-navy dark:text-white">{selectedTier.label}</h3>
                    {selectedTier.id === currentPlanId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Your Plan
                      </span>
                    )}
                  </div>
                  {selectedTier.id === currentPlanId && planStatus?.started && (
                    <div className={`inline-flex items-center gap-1 text-xs font-semibold mt-1.5 px-2 py-0.5 rounded-full ${planStatus.expired ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40'}`}>
                      {planStatus.expired ? <AlertTriangle className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                      {planStatus.expired
                        ? 'Expired'
                        : `${planStatus.daysLeft} day${planStatus.daysLeft === 1 ? '' : 's'} left — ends ${planStatus.endsAt ? new Date(planStatus.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`}
                    </div>
                  )}
                  {selectedTier.tagline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedTier.tagline}</p>}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    {selectedTier.property_cap ? `${selectedTier.property_cap} propert${selectedTier.property_cap === 1 ? 'y' : 'ies'}` : 'Unlimited properties'}
                    {' · '}
                    {selectedTier.lead_cap ? `Up to ${selectedTier.lead_cap} leads` : 'Unlimited leads'}
                    {' · '}
                    {selectedTier.can_export ? 'CSV/PDF export' : 'No CSV/PDF export'}
                    {' · '}
                    {formatPlanDuration(selectedTier.duration_months)}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary whitespace-nowrap shrink-0">{formatPlanPrice(selectedTier.price)}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            To renew or move to a different plan, contact Roofmint — an admin sets this on your account.
          </p>
        </div>
      </div>
    </div>
  );
}
