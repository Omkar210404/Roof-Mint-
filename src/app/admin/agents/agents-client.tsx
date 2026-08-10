'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trash2, Edit, Plus, X, Check, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createAgent, updateAgent, deleteAgent } from './actions';

type SortKey = 'date' | 'name';
type SortDir = 'asc' | 'desc';

export function AgentsClientWrapper({ initialAgents }: { initialAgents: any[] }) {
  const [agents, setAgents] = useState<any[]>(initialAgents);
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

  const resetForm = () => {
    setEditingAgent(null);
    setName('');
    setPhone('');
    setEmail('');
    setCompany('');
    setCommissionNotes('');
  };

  const startEdit = (agent: any) => {
    setEditingAgent(agent);
    setName(agent.name || '');
    setPhone(agent.phone || '');
    setEmail(agent.email || '');
    setCompany(agent.company || '');
    setCommissionNotes(agent.commission_notes || '');
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Agents Management</h1>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{agents.length} total</span>
      </div>

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
                  <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">
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
