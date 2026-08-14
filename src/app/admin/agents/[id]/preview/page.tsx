import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Phone, Mail, Building2, Crown, AlertTriangle } from 'lucide-react';
import { getAgentPreview } from '../../preview-actions';
import { formatPlanDuration } from '@/lib/agent-plans';

const statusStyle: Record<string, string> = {
  new: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  follow_up: 'bg-purple-50 text-purple-700 border-purple-200',
  site_visit: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  closed_won: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
  closed_lost: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900',
};

export default async function AgentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAgentPreview(id);

  if (!data) notFound();

  const { agent, planStatus, leads, properties } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/agents" className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">{agent.name}'s Portal</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{agent.company || 'No company set'}</p>
        </div>
      </div>

      {/* Preview banner */}
      <div className="flex items-center gap-2.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-3 text-sm text-teal-800 dark:text-teal-300">
        <Eye className="w-4 h-4 shrink-0" />
        <span><strong>Admin Preview</strong> — this shows exactly what {agent.name} currently sees in their own portal (read-only; nothing here can be edited from this page).</span>
      </div>

      {!agent.hasPortalAccess && (
        <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          This agent doesn't have portal access yet — they can't log in at all right now.
        </div>
      )}

      {/* Plan status */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 border border-gray-100/60 dark:border-gray-800/60 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-primary flex items-center justify-center">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy dark:text-white">{planStatus.tier.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {!planStatus.started ? 'Plan not started' : planStatus.expired ? 'Plan expired' : `${planStatus.daysLeft} day${planStatus.daysLeft === 1 ? '' : 's'} left · ${formatPlanDuration(planStatus.tier.duration_months)} plan`}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span><strong className="text-navy dark:text-white">{planStatus.tier.lead_cap ?? '∞'}</strong> lead cap</span>
          <span><strong className="text-navy dark:text-white">{planStatus.tier.property_cap ?? '∞'}</strong> property cap</span>
        </div>
      </div>

      {/* Leads visible to this agent */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Leads Visible To Them ({leads.length})</h2>
        </div>
        {leads.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">No leads currently visible to this agent.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {leads.map((lead: any) => (
              <div key={lead.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-navy dark:text-white">{lead.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>
                    {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${statusStyle[lead.status] || statusStyle.new}`}>
                  {(lead.status || 'new').replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Properties assigned to this agent */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Properties Visible To Them ({properties.length})</h2>
        </div>
        {properties.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
            {!planStatus.started || planStatus.expired ? 'None — their plan is inactive or expired.' : 'No properties assigned to this agent.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-5">
            {properties.map((p: any) => (
              <div key={p.id} className="border border-gray-100/60 dark:border-gray-800/60 rounded-xl overflow-hidden">
                <div className="h-24 bg-gray-100 dark:bg-navy-800 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-navy dark:text-white truncate">{p.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.locality || p.city}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
