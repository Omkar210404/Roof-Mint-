'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Trash2, Edit, Plus, X, Check, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, KeyRound, ShieldCheck, ShieldOff, Crown, Clock3, AlertTriangle, Settings, Eye, FileSpreadsheet, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createAgent, updateAgent, deleteAgent, grantAgentAccess, resetAgentPassword, resetAgentMfa, revokeAgentAccess, setAgentPlan } from './actions';
import { computePlanStatus, formatPlanPrice, formatPlanDuration, findTier, type AgentPlanTier } from '@/lib/agent-plans';
import { PlanManagerModal } from './plan-manager-modal';

type SortKey = 'date' | 'name';
type SortDir = 'asc' | 'desc';

function formatLastActive(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function AgentsClientWrapper({ initialAgents, initialPlanTiers }: { initialAgents: any[]; initialPlanTiers: AgentPlanTier[] }) {
  const [agents, setAgents] = useState<any[]>(initialAgents);
  const [planTiers, setPlanTiers] = useState<AgentPlanTier[]>(initialPlanTiers);
  const [showPlanManager, setShowPlanManager] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredSorted = useMemo(() => {
    let result = agents;
    if (debouncedQuery) {
      result = result.filter(a => {
        const haystack = [a.name, a.company, a.phone, a.email].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(debouncedQuery);
      });
    }
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      else cmp = (a.name || '').localeCompare(b.name || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [agents, debouncedQuery, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc'); }
  };

  const allFilteredSelected = filteredSorted.length > 0 && filteredSorted.every(a => selectedIds.has(a.id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredSorted.forEach(a => next.delete(a.id));
      else filteredSorted.forEach(a => next.add(a.id));
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkDeleteAgents = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected agent${ids.length > 1 ? 's' : ''}? Properties/leads assigned to them will become Unassigned.`)) return;
    setBulkBusy(true);
    setAgents(prev => prev.filter(a => !selectedIds.has(a.id)));
    await Promise.all(ids.map(id => deleteAgent(id)));
    clearSelection();
    setBulkBusy(false);
  };

  const exportCSV = () => {
    const header = ['Name', 'Company', 'Phone', 'Email', 'Portal Access', 'Last Active', 'Plan']
    const rows = filteredSorted.map(a => [
      a.name,
      a.company || '',
      a.phone || '',
      a.email || '',
      a.user_id ? 'Active' : 'None',
      a.last_sign_in_at ? formatLastActive(a.last_sign_in_at) : 'Never signed in',
      findTier(planTiers, a.plan).label,
    ])
    const escape = (val: unknown) => {
      const s = String(val ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roofmint-agents-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })

    doc.setFontSize(16)
    doc.text('Roofmint — Agents', 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(
      `Generated ${new Date().toLocaleString('en-IN')} · ${filteredSorted.length} agent${filteredSorted.length === 1 ? '' : 's'}`,
      14, 22
    )

    autoTable(doc, {
      startY: 28,
      head: [['Name', 'Company', 'Phone', 'Email', 'Portal Access', 'Last Active', 'Plan']],
      body: filteredSorted.map(a => [
        a.name,
        a.company || '',
        a.phone || '',
        a.email || '',
        a.user_id ? 'Active' : 'None',
        a.last_sign_in_at ? formatLastActive(a.last_sign_in_at) : 'Never signed in',
        findTier(planTiers, a.plan).label,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [13, 148, 136] },
    })

    doc.save(`roofmint-agents-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKeyVal)}
      className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-navy dark:hover:text-white transition-colors"
    >
      {label}
      {sortKey === sortKeyVal ? (
        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [commissionNotes, setCommissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Portal access (agent login) state
  const [portalPassword, setPortalPassword] = useState('');
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalSuccess, setPortalSuccess] = useState<string | null>(null);

  // Plan (pricing tier) state
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>(planTiers[0]?.id || 'trial_pack');

  const resetForm = () => {
    setEditingAgent(null);
    setName('');
    setPhone('');
    setEmail('');
    setCompany('');
    setCommissionNotes('');
    setPortalPassword('');
    setPortalError(null);
    setPortalSuccess(null);
    setPlanError(null);
  };

  const startEdit = (agent: any) => {
    setEditingAgent(agent);
    setName(agent.name || '');
    setPhone(agent.phone || '');
    setEmail(agent.email || '');
    setCompany(agent.company || '');
    setCommissionNotes(agent.commission_notes || '');
    setPortalPassword('');
    setPortalError(null);
    setPortalSuccess(null);
    setPlanError(null);
    setSelectedPlan(agent.plan || planTiers[0]?.id || 'trial_pack');
  };

  const handleSetPlan = async () => {
    if (!editingAgent) return;
    const tier = findTier(planTiers, selectedPlan);
    if (!confirm(`Set "${editingAgent.name}" to ${tier.label} (${formatPlanPrice(tier.price)})? This starts a fresh ${formatPlanDuration(tier.duration_months)} period from today.`)) return;
    setPlanError(null);
    setPlanBusy(true);
    const res = await setAgentPlan(editingAgent.id, selectedPlan);
    setPlanBusy(false);
    if (res?.error) {
      setPlanError(res.error);
      return;
    }
    window.location.reload();
  };

  const handleGrantAccess = async () => {
    if (!editingAgent) return;
    setPortalError(null);
    setPortalSuccess(null);
    if (!email) {
      setPortalError('Add an email above first.');
      return;
    }
    setPortalBusy(true);
    const res = await grantAgentAccess(editingAgent.id, email, portalPassword);
    setPortalBusy(false);
    if (res?.error) {
      setPortalError(res.error);
      return;
    }
    setPortalSuccess('Portal access granted.');
    setPortalPassword('');
    setAgents(prev => prev.map(a => a.id === editingAgent.id ? { ...a, user_id: 'pending' } : a));
    window.location.reload();
  };

  const handleResetPassword = async () => {
    if (!editingAgent) return;
    setPortalError(null);
    setPortalSuccess(null);
    setPortalBusy(true);
    const res = await resetAgentPassword(editingAgent.id, portalPassword);
    setPortalBusy(false);
    if (res?.error) {
      setPortalError(res.error);
      return;
    }
    setPortalSuccess('Password updated.');
    setPortalPassword('');
  };

  const handleResetMfa = async () => {
    if (!editingAgent) return;
    if (!confirm(`Reset two-factor authentication for "${editingAgent.name}"? They'll be able to log in with just their password until they re-enroll 2FA themselves.`)) return;
    setPortalError(null);
    setPortalSuccess(null);
    setPortalBusy(true);
    const res = await resetAgentMfa(editingAgent.id);
    setPortalBusy(false);
    if (res?.error) {
      setPortalError(res.error);
      return;
    }
    setPortalSuccess(res.hadFactor ? '2FA removed — they can log in with just their password now.' : 'This agent didn\'t have 2FA enabled.');
  };

  const handleRevokeAccess = async () => {
    if (!editingAgent) return;
    if (!confirm(`Revoke portal access for "${editingAgent.name}"? They will no longer be able to log in.`)) return;
    setPortalError(null);
    setPortalSuccess(null);
    setPortalBusy(true);
    const res = await revokeAgentAccess(editingAgent.id);
    setPortalBusy(false);
    if (res?.error) {
      setPortalError(res.error);
      return;
    }
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const fd = new FormData();
    fd.append('name', name);
    fd.append('phone', phone);
    fd.append('email', email);
    fd.append('company', company);
    fd.append('commission_notes', commissionNotes);

    if (editingAgent) {
      await updateAgent(editingAgent.id, fd);
      setAgents(prev => prev.map(a => a.id === editingAgent.id ? { ...a, name, phone, email, company, commission_notes: commissionNotes } : a));
    } else {
      await createAgent(fd);
      window.location.reload();
    }

    setSubmitting(false);
    resetForm();
  };

  const handleDelete = async (id: string, agentName: string) => {
    if (!confirm(`Are you sure you want to delete agent "${agentName}"?`)) return;
    setAgents(prev => prev.filter(a => a.id !== id));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    await deleteAgent(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Agents Management</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPlanManager(true)}
            className="h-9 px-3.5 rounded-lg bg-navy dark:bg-teal-700 text-white text-xs font-bold hover:opacity-90 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Settings className="w-3.5 h-3.5" /> Manage Plans
          </button>
          <button
            onClick={exportCSV}
            disabled={filteredSorted.length === 0}
            className="h-9 px-3 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-navy-800 text-navy dark:text-white hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={filteredSorted.length === 0}
            className="h-9 px-3 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-navy-800 text-navy dark:text-white hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </button>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full whitespace-nowrap shrink-0">{agents.length} total</span>
        </div>
      </div>

      {showPlanManager && (
        <PlanManagerModal
          tiers={planTiers}
          onClose={() => setShowPlanManager(false)}
          onSaved={(updated) => setPlanTiers(prev => prev.map(t => t.id === updated.id ? updated : t))}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Add / Edit Form */}
        <div className="md:col-span-1 h-fit bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
          <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">
              {editingAgent ? 'Edit Agent' : 'Add New Agent'}
            </h2>
            {editingAgent && (
              <button onClick={resetForm} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>

          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name *</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Rahul Dravid"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rahul@realty.com"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company / Developer</label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Prestige / Sattva"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Commission / Internal Notes</label>
                <textarea
                  value={commissionNotes}
                  onChange={e => setCommissionNotes(e.target.value)}
                  placeholder="2% commission agreement signed..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[80px] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-primary hover:bg-teal-700 text-white font-semibold h-10 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingAgent ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {submitting ? 'Saving...' : editingAgent ? 'Update Agent' : 'Create Agent'}
              </button>
            </form>

            {/* Portal Access — grant/reset/revoke this agent's login to their own read-only dashboard */}
            {editingAgent && (
              <div className="mt-5 pt-5 border-t border-gray-100/60 dark:border-gray-800/60 space-y-3">
                <Link
                  href={`/admin/agents/${editingAgent.id}/preview`}
                  className="w-full h-9 rounded-lg border border-gray-200/60 dark:border-gray-800/60 text-navy dark:text-white text-xs font-semibold hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview Their Portal View
                </Link>

                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5 pt-2">
                  <KeyRound className="w-3.5 h-3.5" /> Portal Access
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Lets this agent log in at /login to view (read-only) their assigned properties and leads.
                </p>

                {editingAgent.user_id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                      <ShieldCheck className="w-3.5 h-3.5" /> Portal access active
                    </div>
                    <input
                      type="password"
                      value={portalPassword}
                      onChange={e => setPortalPassword(e.target.value)}
                      placeholder="New password (8+ chars, mixed case, number, symbol)"
                      className="w-full h-9 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={portalBusy || !portalPassword}
                        className="flex-1 h-9 rounded-lg bg-gray-100 dark:bg-navy-800 text-navy dark:text-white text-xs font-semibold hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-50 transition-colors"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeAccess}
                        disabled={portalBusy}
                        className="flex-1 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShieldOff className="w-3.5 h-3.5" /> Revoke Access
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetMfa}
                      disabled={portalBusy}
                      className="w-full h-9 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                      title="Removes their authenticator app 2FA — use this if they're locked out, unreachable, or you need emergency access despite them having 2FA on"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset Their 2FA
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={portalPassword}
                      onChange={e => setPortalPassword(e.target.value)}
                      placeholder="Set a password (8+ chars, mixed case, number, symbol)"
                      className="w-full h-9 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleGrantAccess}
                      disabled={portalBusy || !portalPassword}
                      className="w-full h-9 rounded-lg bg-navy dark:bg-teal-700 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {portalBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                      Grant Portal Access
                    </button>
                  </div>
                )}

                {portalError && <p className="text-xs text-red-600">{portalError}</p>}
                {portalSuccess && <p className="text-xs text-green-700">{portalSuccess}</p>}
              </div>
            )}

            {/* Plan — gates how many leads/properties this agent's portal shows */}
            {editingAgent && editingAgent.user_id && (() => {
              const status = computePlanStatus(findTier(planTiers, editingAgent.plan), editingAgent.plan_started_at);
              const selectedTier = findTier(planTiers, selectedPlan);
              return (
                <div className="mt-5 pt-5 border-t border-gray-100/60 dark:border-gray-800/60 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" /> Plan
                  </h3>

                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg w-fit ${
                    status.expired
                      ? 'text-red-600 bg-red-50 dark:bg-red-950/40'
                      : 'text-green-700 bg-green-50 dark:bg-green-950/40'
                  }`}>
                    {status.expired ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}
                    {status.tier.label}
                    {status.expired ? ' — expired' : status.daysLeft != null ? ` — ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left` : ''}
                  </div>

                  <select
                    value={selectedPlan}
                    onChange={e => setSelectedPlan(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {planTiers.map(tier => (
                      <option key={tier.id} value={tier.id}>{tier.label} — {formatPlanPrice(tier.price)}</option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-navy-800 rounded-lg p-3 space-y-1">
                    <p>{selectedTier.tagline}</p>
                    <p>
                      {selectedTier.property_cap ? `${selectedTier.property_cap} propert${selectedTier.property_cap === 1 ? 'y' : 'ies'}` : 'Unlimited properties'}
                      {' · '}
                      {selectedTier.lead_cap ? `${selectedTier.lead_cap} leads` : 'Unlimited leads'}
                      {' · '}
                      {selectedTier.can_export ? 'CSV/PDF export' : 'No CSV/PDF export'}
                      {' · '}
                      {formatPlanDuration(selectedTier.duration_months)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSetPlan}
                    disabled={planBusy}
                    className="w-full h-9 rounded-lg bg-navy dark:bg-teal-700 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {planBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                    Set Plan{selectedPlan === editingAgent.plan ? ' (Restart Period)' : ''}
                  </button>

                  {planError && <p className="text-xs text-red-600">{planError}</p>}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Agent Table */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, company, phone, email..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-2.5">
              <span className="text-sm font-bold text-primary">{selectedIds.size} selected</span>
              <button onClick={clearSelection} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
              <div className="flex-1" />
              <button
                onClick={bulkDeleteAgents}
                disabled={bulkBusy}
                className="h-8 px-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden h-fit">
          <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Agent Directory</h2>
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{filteredSorted.length} shown</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                    />
                  </TableHead>
                  <TableHead><SortHeader label="Name" sortKeyVal="name" /></TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Portal</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Active</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Plan</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-400 dark:text-gray-500">
                      {agents.length === 0 ? 'No agents found' : 'No agents match your search'}
                    </TableCell>
                  </TableRow>
                ) : filteredSorted.map((agent: any) => (
                  <TableRow key={agent.id} className={selectedIds.has(agent.id) ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(agent.id)}
                        onChange={() => toggleSelectOne(agent.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-navy dark:text-white">
                      <div>{agent.name}</div>
                      {agent.commission_notes && (
                        <div className="text-[10px] text-teal-700 italic truncate max-w-[150px]">{agent.commission_notes}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{agent.company || '—'}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{agent.phone || '—'}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{agent.email || '—'}</TableCell>
                    <TableCell>
                      {agent.user_id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatLastActive(agent.last_sign_in_at) || <span className="italic text-gray-400 dark:text-gray-500">Never signed in</span>}
                    </TableCell>
                    <TableCell>
                      {!agent.user_id ? (
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">—</span>
                      ) : (() => {
                        const status = computePlanStatus(findTier(planTiers, agent.plan), agent.plan_started_at);
                        return (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.expired ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-green-700 bg-green-50 dark:bg-green-950/40'}`}>
                            {status.expired ? <AlertTriangle className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                            {status.tier.label}{status.expired ? ' · Expired' : status.daysLeft != null ? ` · ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} left` : ''}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(agent)}
                          className="text-primary hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                          title="Edit Agent"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(agent.id, agent.name)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                          title="Delete Agent"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
