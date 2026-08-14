'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getLeads, updateLeadStatus, assignLeadAgent, deleteLead, setLeadAgentVisibility } from './actions'
import { AddLeadModal } from './add-lead-modal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, X, FileSpreadsheet, FileText, Plus, Eye, EyeOff, MessageCircle, FileEdit, Globe } from 'lucide-react'

const sourceMeta: Record<string, { label: string; icon: any; style: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, style: 'text-green-700 bg-green-50 dark:bg-green-950/40' },
  manual: { label: 'Manual', icon: FileEdit, style: 'text-purple-700 bg-purple-50 dark:bg-purple-950/40' },
  form: { label: 'Website', icon: Globe, style: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40' },
}
function getSourceMeta(source: string) {
  return sourceMeta[source] || sourceMeta.form
}

const statusOptions = [
  { value: 'new', label: 'New', style: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' },
  { value: 'contacted', label: 'Contacted', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'follow_up', label: 'Follow Up', style: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'site_visit', label: 'Site Visit', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'closed_won', label: 'Closed Won', style: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' },
  { value: 'closed_lost', label: 'Closed Lost', style: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' },
]

function getStatusStyle(status: string) {
  return statusOptions.find(s => s.value === status)?.style || 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-200/60 dark:border-gray-800/60'
}

type SortKey = 'date' | 'name'
type SortDir = 'asc' | 'desc'

export function LeadsClientWrapper({ initialLeads, agents = [], allProperties = [] }: { initialLeads: any[]; agents?: any[]; allProperties?: any[] }) {
  const [leads, setLeads] = useState<any[]>(initialLeads)
  const [showAddLead, setShowAddLead] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const dateRangeActive = !!(startDate && endDate)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const pageSize = 10
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

  // Debounce search so filtering doesn't re-run on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedQuery, statusFilter, propertyFilter, agentFilter, sourceFilter, startDate, endDate])

  // Properties available to filter by, derived from the leads actually
  // present — no separate fetch needed.
  const uniqueProperties = useMemo(() => {
    const map = new Map<string, string>()
    leads.forEach(l => {
      if (l.property_id && l.property?.title) map.set(l.property_id, l.property.title)
    })
    return Array.from(map.entries()).map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title))
  }, [leads])

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
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
    await deleteLead(id)
  }

  const handleLeadAdded = async () => {
    setLeads(await getLeads())
    setShowAddLead(false)
  }

  const filteredSorted = useMemo(() => {
    let result = leads

    if (statusFilter !== 'all') {
      result = result.filter(l => (l.status || 'new') === statusFilter)
    }

    if (propertyFilter !== 'all') {
      result = result.filter(l => l.property_id === propertyFilter)
    }

    if (agentFilter !== 'all') {
      if (agentFilter === 'unassigned') {
        result = result.filter(l => !(l.assigned_agent_id || l.assigned_agent?.id))
      } else {
        result = result.filter(l => (l.assigned_agent_id || l.assigned_agent?.id) === agentFilter)
      }
    }

    if (sourceFilter !== 'all') {
      result = result.filter(l => (l.source || 'form') === sourceFilter)
    }

    if (dateRangeActive) {
      const rangeStart = new Date(startDate + 'T00:00:00').getTime()
      const rangeEnd = new Date(endDate + 'T23:59:59.999').getTime()
      result = result.filter(l => {
        const created = new Date(l.created_at).getTime()
        return created >= rangeStart && created <= rangeEnd
      })
    }

    if (debouncedQuery) {
      result = result.filter(l => {
        const haystack = [l.name, l.phone, l.email, l.message, l.property?.title, l.property?.location_address]
          .filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(debouncedQuery)
      })
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else {
        cmp = (a.name || '').localeCompare(b.name || '')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [leads, statusFilter, propertyFilter, agentFilter, sourceFilter, dateRangeActive, startDate, endDate, debouncedQuery, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  const totalPages = Math.ceil(filteredSorted.length / pageSize) || 1
  const paginatedLeads = filteredSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const pageIds = paginatedLeads.map(l => l.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))

  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id))
      } else {
        pageIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} selected lead${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkBusy(true)
    setLeads(prev => prev.filter(l => !selectedIds.has(l.id)))
    await Promise.all(ids.map(id => deleteLead(id)))
    clearSelection()
    setBulkBusy(false)
  }

  const bulkStatusChange = async (status: string) => {
    if (!status) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true)
    setLeads(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, status } : l))
    await Promise.all(ids.map(id => updateLeadStatus(id, status)))
    setBulkBusy(false)
  }

  const handleToggleAgentVisibility = async (id: string, visible: boolean) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, visible_to_agent: visible } : l))
    await setLeadAgentVisibility(id, visible)
  }

  const bulkSetAgentVisibility = async (visible: boolean) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true)
    setLeads(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, visible_to_agent: visible } : l))
    await Promise.all(ids.map(id => setLeadAgentVisibility(id, visible)))
    setBulkBusy(false)
  }

  const bulkAssignAgent = async (agentId: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const selectedAgent = agents.find(a => a.id === agentId)
    setBulkBusy(true)
    setLeads(prev => prev.map(l => selectedIds.has(l.id) ? { ...l, assigned_agent_id: agentId, assigned_agent: selectedAgent } : l))
    await Promise.all(ids.map(id => assignLeadAgent(id, agentId)))
    setBulkBusy(false)
  }

  const statusLabel = (status: string) => statusOptions.find(s => s.value === status)?.label || status

  // Exports whatever is currently filtered/searched — not the full
  // unfiltered inbox — so the download matches what's on screen.
  const exportCSV = () => {
    const header = ['Date', 'Property', 'Location', 'Name', 'Phone', 'Email', 'Budget', 'Message', 'Source', 'Assigned Agent', 'Status']
    const rows = filteredSorted.map(l => [
      new Date(l.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      l.property?.title || 'General Enquiry',
      l.property?.location_address || '',
      l.name,
      l.phone,
      l.email || '',
      l.budget_hint || '',
      l.message || '',
      getSourceMeta(l.source || 'form').label,
      l.assigned_agent?.name || 'Unassigned',
      statusLabel(l.status || 'new'),
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
    a.download = `roofmint-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })

    doc.setFontSize(16)
    doc.text('Roofmint — Leads & Enquiries', 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(
      `Generated ${new Date().toLocaleString('en-IN')} · ${filteredSorted.length} lead${filteredSorted.length === 1 ? '' : 's'}`,
      14, 22
    )

    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Property', 'Name', 'Phone', 'Email', 'Budget', 'Agent', 'Status']],
      body: filteredSorted.map(l => [
        new Date(l.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        l.property?.title || 'General Enquiry',
        l.name,
        l.phone,
        l.email || '',
        l.budget_hint || '',
        l.assigned_agent?.name || 'Unassigned',
        statusLabel(l.status || 'new'),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [13, 148, 136] },
    })

    doc.save(`roofmint-leads-${new Date().toISOString().slice(0, 10)}.pdf`)
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
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Leads & Enquiries</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddLead(true)}
            className="h-9 px-3 rounded-lg text-xs font-semibold bg-primary hover:bg-teal-700 text-white transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </button>
          <button
            onClick={exportCSV}
            disabled={filteredSorted.length === 0}
            className="h-9 px-3 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-navy-800 text-navy dark:text-white hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={filteredSorted.length === 0}
            className="h-9 px-3 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-navy-800 text-navy dark:text-white hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </button>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{leads.length} total</span>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email, property..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Properties</option>
          {uniqueProperties.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Agents</option>
          <option value="unassigned">Unassigned</option>
          {agents.map((agent: any) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Sources</option>
          <option value="form">Website</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="manual">Manual</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined}
            className="h-10 px-2.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-navy dark:text-white"
          />
          <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
            className="h-10 px-2.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium text-navy dark:text-white"
          />
          {dateRangeActive && (
            <button
              onClick={() => { setStartDate(''); setEndDate('') }}
              title="Clear date range"
              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 dark:hover:bg-navy-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-2.5">
          <span className="text-sm font-bold text-primary">{selectedIds.size} selected</span>
          <button onClick={clearSelection} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
          <div className="flex-1" />
          <select
            defaultValue=""
            disabled={bulkBusy}
            onChange={(e) => { bulkStatusChange(e.target.value); e.target.value = '' }}
            className="h-8 text-xs font-medium bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 rounded-lg px-2 text-navy dark:text-white focus:outline-none disabled:opacity-50"
          >
            <option value="" disabled>Set Status...</option>
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            defaultValue=""
            disabled={bulkBusy}
            onChange={(e) => { bulkAssignAgent(e.target.value); e.target.value = '' }}
            className="h-8 text-xs font-medium bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 rounded-lg px-2 text-navy dark:text-white focus:outline-none disabled:opacity-50"
          >
            <option value="" disabled>Assign Agent...</option>
            <option value="">Unassigned</option>
            {agents.map((agent: any) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <button
            onClick={() => bulkSetAgentVisibility(true)}
            disabled={bulkBusy}
            className="h-8 px-3 bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 text-navy dark:text-white hover:bg-gray-50 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" /> Show to Agent
          </button>
          <button
            onClick={() => bulkSetAgentVisibility(false)}
            disabled={bulkBusy}
            className="h-8 px-3 bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 text-navy dark:text-white hover:bg-gray-50 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <EyeOff className="w-3.5 h-3.5" /> Hide from Agent
          </button>
          <button
            onClick={bulkDelete}
            disabled={bulkBusy}
            className="h-8 px-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Enquiries Inbox</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">Page {currentPage} of {totalPages}</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                  />
                </TableHead>
                <TableHead><SortHeader label="Date" sortKeyVal="date" /></TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Property</TableHead>
                <TableHead><SortHeader label="Enquirer Info" sortKeyVal="name" /></TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Message / Budget</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assigned Agent</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agent Visibility</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    {leads.length === 0 ? 'No leads found' : 'No leads match your search/filter'}
                  </TableCell>
                </TableRow>
              ) : paginatedLeads.map((lead: any) => (
                <TableRow key={lead.id} className={selectedIds.has(lead.id) ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelectOne(lead.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs font-medium">
                    {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-navy dark:text-white text-sm">{lead.property?.title || 'General Enquiry'}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lead.property?.location_address}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-navy dark:text-white text-sm">{lead.name}</span>
                      {(() => {
                        const meta = getSourceMeta(lead.source || 'form')
                        const SourceIcon = meta.icon
                        return (
                          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${meta.style}`}>
                            <SourceIcon className="w-2.5 h-2.5" /> {meta.label}
                          </span>
                        )
                      })()}
                    </div>
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
                      className="h-8 text-xs font-medium bg-gray-50 dark:bg-navy-800 border border-gray-200/60 dark:border-gray-800/60 rounded-lg px-2 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                    {lead.status_updated_at && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        since {new Date(lead.status_updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleAgentVisibility(lead.id, !(lead.visible_to_agent ?? true))}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        (lead.visible_to_agent ?? true)
                          ? 'bg-green-50 dark:bg-green-950/40 text-green-700'
                          : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400'
                      }`}
                      title={(lead.visible_to_agent ?? true) ? 'Visible to assigned agent — click to hide' : 'Hidden from assigned agent — click to show'}
                    >
                      {(lead.visible_to_agent ?? true) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {(lead.visible_to_agent ?? true) ? 'Visible' : 'Hidden'}
                    </button>
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
          <div className="px-5 py-3 border-t border-gray-100/60 dark:border-gray-800/60 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredSorted.length)} of {filteredSorted.length} leads
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-navy dark:text-white px-2">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="w-8 h-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddLead && (
        <AddLeadModal
          agents={agents}
          properties={allProperties}
          onClose={() => setShowAddLead(false)}
          onAdded={handleLeadAdded}
        />
      )}
    </div>
  )
}
