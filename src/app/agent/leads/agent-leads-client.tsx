'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getMyLeads, updateMyLeadStatus } from '../actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Phone, MessageCircle, FileSpreadsheet, FileText, Crown, AlertTriangle, Lock } from 'lucide-react'
import type { PlanStatus } from '@/lib/agent-plans'

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

function toWaLink(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCountryCode}`
}

type SortKey = 'date' | 'name'
type SortDir = 'asc' | 'desc'

export function AgentLeadsClient({ initialLeads, plan }: { initialLeads: any[]; plan: PlanStatus | null }) {
  const [leads, setLeads] = useState<any[]>(initialLeads)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const supabase = createClient()

  // Live updates: RLS scopes this to leads assigned to this agent only.
  useEffect(() => {
    const channel = supabase
      .channel('agent_leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, async () => {
        setLeads(await getMyLeads())
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredSorted = useMemo(() => {
    let result = leads

    if (statusFilter !== 'all') {
      result = result.filter(l => (l.status || 'new') === statusFilter)
    }

    if (debouncedQuery) {
      result = result.filter(l => {
        const haystack = [l.name, l.phone, l.email, l.message, l.property?.title, l.property?.location_address]
          .filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(debouncedQuery)
      })
    }

    return [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else cmp = (a.name || '').localeCompare(b.name || '')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [leads, statusFilter, debouncedQuery, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc') }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
    await updateMyLeadStatus(id, newStatus)
  }

  const statusLabel = (status: string) => statusOptions.find(s => s.value === status)?.label || status

  // Exports whatever is currently filtered/searched into view — not
  // necessarily every lead ever assigned — so what you download matches
  // what you're looking at.
  const exportCSV = () => {
    const header = ['Date', 'Property', 'Location', 'Name', 'Phone', 'Email', 'Budget', 'Message', 'Status']
    const rows = filteredSorted.map(l => [
      new Date(l.created_at).toLocaleDateString('en-IN'),
      l.property?.title || 'General Enquiry',
      l.property?.location_address || '',
      l.name,
      l.phone,
      l.email || '',
      l.budget_hint || '',
      l.message || '',
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
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Roofmint — My Leads', 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(
      `Generated ${new Date().toLocaleString('en-IN')} · ${filteredSorted.length} lead${filteredSorted.length === 1 ? '' : 's'}`,
      14, 22
    )

    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Property', 'Name', 'Phone', 'Email', 'Budget', 'Status']],
      body: filteredSorted.map(l => [
        new Date(l.created_at).toLocaleDateString('en-IN'),
        l.property?.title || 'General Enquiry',
        l.name,
        l.phone,
        l.email || '',
        l.budget_hint || '',
        statusLabel(l.status || 'new'),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [13, 148, 136] },
    })

    doc.save(`roofmint-leads-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const canExport = plan?.tier.can_export ?? false

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
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">My Leads</h1>
        <div className="flex items-center gap-2">
          {plan && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${plan.expired ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-green-700 bg-green-50 dark:bg-green-950/40'}`}>
              {plan.expired ? <AlertTriangle className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
              {plan.tier.label}{plan.expired ? ' · Expired' : plan.daysLeft != null ? ` · ${plan.daysLeft}d left` : ''}
            </span>
          )}
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{leads.length} total</span>
        </div>
      </div>

      {plan?.expired && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Your {plan.tier.label} has ended</p>
            <p className="text-xs text-red-600 dark:text-red-400/80">Your plan period is over, so your leads are no longer shown here. Renew or upgrade to get access back.</p>
          </div>
          <a
            href="https://wa.me/917096867438?text=Hi%20Roofmint%2C%20my%20agent%20plan%20has%20ended%20and%20I%27d%20like%20to%20renew%20or%20upgrade."
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
          >
            Contact to Renew
          </a>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
      </div>

      {plan && !plan.expired && plan.tier.lead_cap != null && (
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
          {plan.tier.label} shows your oldest {plan.tier.lead_cap} assigned leads. Upgrade for full access.
        </p>
      )}

      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide shrink-0">Assigned Enquiries</h2>
          <div className="flex items-center gap-2">
            {canExport ? (
              <>
                <button
                  onClick={exportCSV}
                  disabled={filteredSorted.length === 0}
                  className="h-8 px-2.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-navy-800 text-navy dark:text-white hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                  title="Download CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={exportPDF}
                  disabled={filteredSorted.length === 0}
                  className="h-8 px-2.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-navy-800 text-navy dark:text-white hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                  title="Download PDF"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </>
            ) : (
              <span
                className="h-8 px-2.5 rounded-md text-xs font-medium bg-gray-50 dark:bg-navy-800/60 text-gray-400 dark:text-gray-500 inline-flex items-center gap-1.5"
                title="CSV/PDF export is available on the Paid plan"
              >
                <Lock className="w-3.5 h-3.5" /> Export (Paid only)
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{filteredSorted.length} shown</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader label="Date" sortKeyVal="date" /></TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Property</TableHead>
                <TableHead><SortHeader label="Enquirer Info" sortKeyVal="name" /></TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Message / Budget</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    {leads.length === 0 ? 'No leads assigned to you yet' : 'No leads match your search/filter'}
                  </TableCell>
                </TableRow>
              ) : filteredSorted.map((lead: any) => (
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
                  <TableCell>
                    <select
                      value={lead.status || 'new'}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className={`h-8 text-xs font-semibold rounded-lg px-2 border focus:outline-none focus:ring-2 focus:ring-primary/20 ${getStatusStyle(lead.status || 'new')}`}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-navy dark:text-white hover:opacity-80 bg-gray-100 dark:bg-navy-800 h-8 px-2.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={toWaLink(lead.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 hover:text-green-800 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
