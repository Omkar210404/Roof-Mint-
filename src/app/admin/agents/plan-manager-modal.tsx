'use client';

import { useState } from 'react';
import { X, Edit, Check, Loader2 } from 'lucide-react';
import { updatePlanTier } from '../../plans/actions';
import { formatPlanPrice, type AgentPlanTier } from '@/lib/agent-plans';

const fieldCls = "w-full h-9 px-2.5 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

export function PlanManagerModal({ tiers, onClose, onSaved }: {
  tiers: AgentPlanTier[];
  onClose: () => void;
  onSaved: (updated: AgentPlanTier) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AgentPlanTier>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (tier: AgentPlanTier) => {
    setEditingId(tier.id);
    setDraft({ ...tier });
    setError(null);
  };

  const save = async () => {
    if (!editingId) return;
    setBusy(true);
    setError(null);
    const res = await updatePlanTier(editingId, {
      label: draft.label,
      price: draft.price === null || draft.price === undefined ? null : Number(draft.price),
      duration_months: Number(draft.duration_months) || 1,
      property_cap: draft.property_cap === null || draft.property_cap === undefined || (draft.property_cap as any) === '' ? null : Number(draft.property_cap),
      lead_cap: draft.lead_cap === null || draft.lead_cap === undefined || (draft.lead_cap as any) === '' ? null : Number(draft.lead_cap),
      can_export: !!draft.can_export,
      tagline: draft.tagline,
    });
    setBusy(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    onSaved({ ...(tiers.find(t => t.id === editingId) as AgentPlanTier), ...draft } as AgentPlanTier);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-navy-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-14 px-5 border-b border-gray-100/60 dark:border-gray-800/60 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Manage Plan Tiers</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1 mb-2">
            Editing a tier here changes it for every agent currently on it — including the price/caps agents see in their own portal.
          </p>

          {tiers.map(tier => (
            <div key={tier.id} className="border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4">
              {editingId === tier.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Label</label>
                      <input className={fieldCls} value={draft.label ?? ''} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Price (₹, blank = &quot;As Required&quot;)</label>
                      <input type="number" className={fieldCls} value={draft.price ?? ''} onChange={e => setDraft(d => ({ ...d, price: e.target.value === '' ? null : Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Duration (months)</label>
                      <input type="number" min={1} className={fieldCls} value={draft.duration_months ?? 1} onChange={e => setDraft(d => ({ ...d, duration_months: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Property cap (blank = unlimited)</label>
                      <input type="number" min={0} className={fieldCls} value={draft.property_cap ?? ''} onChange={e => setDraft(d => ({ ...d, property_cap: e.target.value === '' ? null : Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Lead cap (blank = unlimited)</label>
                      <input type="number" min={0} className={fieldCls} value={draft.lead_cap ?? ''} onChange={e => setDraft(d => ({ ...d, lead_cap: e.target.value === '' ? null : Number(e.target.value) }))} />
                    </div>
                    <div className="flex items-end pb-1.5">
                      <label className="flex items-center gap-2 text-xs font-medium text-navy dark:text-white">
                        <input type="checkbox" checked={!!draft.can_export} onChange={e => setDraft(d => ({ ...d, can_export: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30" />
                        CSV/PDF export allowed
                      </label>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tagline</label>
                      <input className={fieldCls} value={draft.tagline ?? ''} onChange={e => setDraft(d => ({ ...d, tagline: e.target.value }))} />
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={save}
                      disabled={busy}
                      className="h-8 px-3 bg-primary hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={busy}
                      className="h-8 px-3 bg-gray-100 dark:bg-navy-800 text-navy dark:text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-navy dark:text-white">{tier.label}</h3>
                      <span className="text-xs font-semibold text-primary">{formatPlanPrice(tier.price)}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tier.tagline}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {tier.property_cap ? `${tier.property_cap} propert${tier.property_cap === 1 ? 'y' : 'ies'}` : 'Unlimited properties'}
                      {' · '}
                      {tier.lead_cap ? `${tier.lead_cap} leads` : 'Unlimited leads'}
                      {' · '}
                      {tier.can_export ? 'Export allowed' : 'No export'}
                      {' · '}
                      {tier.duration_months === 12 ? '1 year' : '1 month'}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(tier)}
                    className="text-primary hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
