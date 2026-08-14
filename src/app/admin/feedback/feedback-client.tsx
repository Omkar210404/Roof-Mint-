'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getFeedback, updateFeedbackStatus, deleteFeedback } from './actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Trash2, Search, Mail, Phone, Star } from 'lucide-react'

const statusOptions = [
  { value: 'new', label: 'New', style: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' },
  { value: 'reviewed', label: 'Reviewed', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'resolved', label: 'Resolved', style: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' },
]

function getStatusStyle(status: string) {
  return statusOptions.find(s => s.value === status)?.style || 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-200/60 dark:border-gray-800/60'
}

const categoryStyle: Record<string, string> = {
  'Feedback & Suggestions': 'bg-purple-50 text-purple-700 border-purple-200',
  'Property Enquiry': 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  'Site Visit Request': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'RERA / Legal Clarification': 'bg-amber-50 text-amber-700 border-amber-200',
  'General Query': 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-200/60 dark:border-gray-800/60',
  'App Rating': 'bg-amber-50 text-amber-700 border-amber-200',
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
      ))}
    </div>
  )
}

export function FeedbackClientWrapper({ initialFeedback }: { initialFeedback: any[] }) {
  const [items, setItems] = useState<any[]>(initialFeedback)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const pageSize = 10
  const supabase = createClient()

  useEffect(() => {
    const refresh = async () => setItems(await getFeedback())

    const channel = supabase
      .channel('feedback_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => refresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedQuery, statusFilter, categoryFilter])

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.category) set.add(i.category) })
    return Array.from(set)
  }, [items])

  const handleStatusChange = async (id: string, newStatus: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
    await updateFeedbackStatus(id, newStatus)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete the message from "${name}"?`)) return
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteFeedback(id)
  }

  const filtered = useMemo(() => {
    let result = items
    if (statusFilter !== 'all') result = result.filter(i => (i.status || 'new') === statusFilter)
    if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter)
    if (debouncedQuery) {
      result = result.filter(i => {
        const haystack = [i.name, i.phone, i.email, i.message, i.category].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(debouncedQuery)
      })
    }
    return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [items, statusFilter, categoryFilter, debouncedQuery])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Feedback & Messages</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Submissions from the "Send Us a Message" form on Help & Support</p>
        </div>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{items.length} total</span>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email, message..."
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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
                  No messages found.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <p className="text-sm font-semibold text-navy dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phone}</p>
                    {item.email && <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</p>}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${categoryStyle[item.category] || categoryStyle['General Query']}`}>
                      {item.category}
                    </span>
                    {typeof item.rating === 'number' && <RatingStars rating={item.rating} />}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal text-sm text-gray-600 dark:text-gray-300">{item.message}</TableCell>
                  <TableCell>
                    <select
                      value={item.status || 'new'}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border ${getStatusStyle(item.status || 'new')}`}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-500 dark:text-red-400 flex items-center justify-center ml-auto"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages} &middot; {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
