'use client';

import { X, Crown, Check, AlertTriangle, Clock3 } from 'lucide-react';
import { formatPlanPrice, type AgentPlanTier, type PlanStatus } from '@/lib/agent-plans';

export function PlansModal({ tiers, planStatus, onClose }: {
  tiers: AgentPlanTier[];
  planStatus?: PlanStatus | null;
  onClose: () => void;
}) {
  const currentPlanId = planStatus?.tier.id ?? null;
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

        <div className="overflow-y-auto p-5 space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1 mb-2">
            To renew or move to a different plan, contact Roofmint — an admin sets this on your account.
          </p>

          {tiers.map(tier => {
            const isCurrent = tier.id === currentPlanId;
            return (
              <div
                key={tier.id}
                className={`rounded-xl p-4 border ${isCurrent ? 'border-primary bg-teal-50/60 dark:bg-teal-950/20' : 'border-gray-100/60 dark:border-gray-800/60'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-navy dark:text-white">{tier.label}</h3>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Your Plan
                        </span>
                      )}
                    </div>
                    {isCurrent && planStatus?.started && (
                      <div className={`inline-flex items-center gap-1 text-xs font-semibold mt-1.5 px-2 py-0.5 rounded-full ${planStatus.expired ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40'}`}>
                        {planStatus.expired ? <AlertTriangle className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                        {planStatus.expired
                          ? 'Expired'
                          : `${planStatus.daysLeft} day${planStatus.daysLeft === 1 ? '' : 's'} left — ends ${planStatus.endsAt ? new Date(planStatus.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`}
                      </div>
                    )}
                    {tier.tagline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tier.tagline}</p>}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      {tier.property_cap ? `${tier.property_cap} propert${tier.property_cap === 1 ? 'y' : 'ies'}` : 'Unlimited properties'}
                      {' · '}
                      {tier.lead_cap ? `Up to ${tier.lead_cap} leads` : 'Unlimited leads'}
                      {' · '}
                      {tier.can_export ? 'CSV/PDF export' : 'No CSV/PDF export'}
                      {' · '}
                      {tier.duration_months === 12 ? '1 year' : '1 month'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary whitespace-nowrap shrink-0">{formatPlanPrice(tier.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
