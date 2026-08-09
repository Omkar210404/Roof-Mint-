'use client';

import { useState } from 'react';
import { Trash2, Edit, Plus, X, Check, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createAgent, updateAgent, deleteAgent } from './actions';

export function AgentsClientWrapper({ initialAgents }: { initialAgents: any[] }) {
  const [agents, setAgents] = useState<any[]>(initialAgents);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);

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
        <div className="md:col-span-1 h-fit bg-white dark:bg-navy-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden">
          <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
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
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rahul@realty.com"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company / Developer</label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Prestige / Sattva"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Commission / Internal Notes</label>
                <textarea
                  value={commissionNotes}
                  onChange={e => setCommissionNotes(e.target.value)}
                  placeholder="2% commission agreement signed..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[80px] resize-none"
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
        <div className="md:col-span-2 bg-white dark:bg-navy-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden h-fit">
          <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800 flex items-center">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Agent Directory</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">No agents found</TableCell>
                  </TableRow>
                ) : agents.map((agent: any) => (
                  <TableRow key={agent.id}>
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
  );
}
