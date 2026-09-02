'use client';

import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { updateManualLead } from './actions';

const inputCls = "w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
const labelCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide";

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
]

export function EditLeadModal({ lead, agents, properties, onClose, onUpdated }: {
  lead: any;
  agents: any[];
  properties: any[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState(lead.phone || '+91');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const res = await updateManualLead(lead.id, fd);

    if (res?.error) {
      setError(res.error);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-navy-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-14 px-5 border-b border-gray-100/60 dark:border-gray-800/60 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Edit Lead</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className={labelCls}>Name *</label>
              <input name="name" required defaultValue={lead.name || ''} placeholder="Rahul Sharma" className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className={labelCls}>Phone *</label>
              <input
                name="phone"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98XXX XXXXX"
                className={inputCls}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>Email</label>
              <input name="email" type="email" defaultValue={lead.email || ''} placeholder="rahul@gmail.com" className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className={labelCls}>Property</label>
              <select name="property_id" defaultValue={lead.property_id || ''} className={inputCls}>
                <option value="">General Enquiry</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className={labelCls}>Budget</label>
              <input name="budget_hint" defaultValue={lead.budget_hint || ''} placeholder="₹80L-1 Cr" className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className={labelCls}>Status</label>
              <select name="status" defaultValue={lead.status || 'new'} className={inputCls}>
                {statusOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className={labelCls}>Assign Agent</label>
              <select name="assigned_agent_id" defaultValue={lead.assigned_agent_id || lead.assigned_agent?.id || ''} className={inputCls}>
                <option value="">Unassigned</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>Message / Notes</label>
              <textarea name="message" rows={3} defaultValue={lead.message || ''} placeholder="Interested in 3BHK, looking for immediate possession..." className={inputCls + " resize-none py-2 h-auto"} />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-primary hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
