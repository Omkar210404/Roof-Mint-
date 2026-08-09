'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getLeads, updateLeadStatus, assignLeadAgent, deleteLead } from './actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

const statusOptions = [
  { value: 'new', label: 'New', style: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' },
  { value: 'contacted', label: 'Contacted', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'follow_up', label: 'Follow Up', style: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'site_visit', label: 'Site Visit', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'closed_won', label: 'Closed Won', style: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' },
  { value: 'closed_lost', label: 'Closed Lost', style: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' },
]

function getStatusStyle(status: string) {
  return statusOptions.find(s => s.value === status)?.style || 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'
}

export function LeadsClientWrapper({ initialLeads, agents = [] }: { initialLeads: any[]; agents?: any[] }) {
  const [leads, setLeads] = useState<any[]>(initialLeads)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5
  const supabase = createClient()

  useEffect(() => {
    const fetchLeads = async () => {
      const dbLeads = await getLeads()
      setLeads(dbLeads)
    }

    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => {
        fetchLeads()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
    await updateLeadStatus(id, newStatus)
  }

  const handleAgentAssign = async (leadId: string, agentId: string) => {
    const selectedAgent = agents.find(a => a.id === agentId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assigned_agent_id: agentId, assigned_agent: selectedAgent } : l))
    await assignLeadAgent(leadId, agentId)
  }

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete lead from "${name}"?`)) return
    setLeads(prev => prev.filter(l => l.id !== id))
    await deleteLead(id)
  }

  const totalPages = Math.ceil(leads.length / pageSize) || 1
  const paginatedLeads = leads.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Leads & Enquiries</h1>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{leads.length} total</span>
      </div>

      <div className="bg-white dark:bg-navy-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Enquiries Inbox</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">Page {currentPage} of {totalPages}</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Property</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Enquirer Info</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Message / Budget</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assigned Agent</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400 dark:text-gray-500">No leads found</TableCell>
                </TableRow>
              ) : paginatedLeads.map((lead: any) => (
                <TableRow key={lead.id}>
                  <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs font-medium">
                    {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-navy dark:text-white text-sm">{lead.property?.title || 'General Enquiry'}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lead.property?.location_address}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-navy dark:text-white text-sm">{lead.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lead.phone}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{lead.email}</div>
                  </TableCell>
                  <TableCell>
                    {lead.budget_hint && (
                      <span className="inline-block bg-teal-50 dark:bg-teal-950/40 text-teal-700 font-bold text-[10px] px-2 py-0.5 rounded-md mb-1">
                        {lead.budget_hint}
                      </span>
                    )}
                    <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{lead.message || '—'}</div>
                  </TableCell>
                  {/* Agent Assign Select */}
                  <TableCell>
                    <select
                      value={lead.assigned_agent_id || lead.assigned_agent?.id || ''}
                      onChange={(e) => handleAgentAssign(lead.id, e.target.value)}
                      className="h-8 text-xs font-medium bg-gray-50 dark:bg-navy-800 border border-gray-200 dark:border-gray-800 rounded-lg px-2 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Unassigned</option>
                      {agents.map((agent: any) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.company || 'Agent'})
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  {/* Status Select */}
                  <TableCell>
                    <select
                      value={lead.status || 'new'}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className={`h-8 text-xs font-semibold rounded-lg px-2 border focus:outline-none focus:ring-2 focus:ring-primary/20 ${getStatusStyle(lead.status || 'new')}`}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDeleteLead(lead.id, lead.name)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, leads.length)} of {leads.length} leads
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-navy dark:text-white px-2">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
