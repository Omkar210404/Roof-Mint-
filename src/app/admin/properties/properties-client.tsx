'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2, Eye, Edit, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getProperties, deleteProperty, updatePropertyStatus } from './actions'

const statusStyles: Record<string, string> = {
  available: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700',
  sold: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  reserved: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300',
  coming_soon: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
}

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'sold', label: 'Sold' },
]

type SortKey = 'date' | 'title' | 'price'
type SortDir = 'asc' | 'desc'

export function PropertiesClientWrapper({ initialProperties }: { initialProperties: any[] }) {
  const [properties, setProperties] = useState<any[]>(initialProperties)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const pageSize = 10
  const supabase = createClient()

  useEffect(() => {
    const fetchProperties = async () => {
      const dbProperties = await getProperties()
      setProperties(dbProperties)
    }

    const channel = supabase
      .channel('properties_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        fetchProperties()
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

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedQuery, statusFilter])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete property "${title}"?`)) return
    setDeletingId(id)
    setProperties(prev => prev.filter(p => p.id !== id))
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
    await deleteProperty(id)
    setDeletingId(null)
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
    await updatePropertyStatus(id, newStatus)
  }

  const filteredSorted = useMemo(() => {
    let result = properties

    if (statusFilter !== 'all') {
      result = result.filter(p => (p.status || 'available') === statusFilter)
    }

    if (debouncedQuery) {
      result = result.filter(p => {
        const haystack = [p.title, p.location_address, p.city, p.locality, p.primary_agent?.name]
          .filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(debouncedQuery)
      })
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (sortKey === 'price') cmp = (a.price || 0) - (b.price || 0)
      else cmp = (a.title || '').localeCompare(b.title || '')
      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [properties, statusFilter, debouncedQuery, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  const totalPages = Math.ceil(filteredSorted.length / pageSize) || 1
  const paginatedProperties = filteredSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const pageIds = paginatedProperties.map(p => p.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))

  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
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
    if (!confirm(`Delete ${ids.length} selected propert${ids.length > 1 ? 'ies' : 'y'}? This cannot be undone.`)) return
    setBulkBusy(true)
    setProperties(prev => prev.filter(p => !selectedIds.has(p.id)))
    await Promise.all(ids.map(id => deleteProperty(id)))
    clearSelection()
    setBulkBusy(false)
  }

  const bulkStatusChange = async (status: string) => {
    if (!status) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true)
    setProperties(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, status } : p))
    await Promise.all(ids.map(id => updatePropertyStatus(id, status)))
    setBulkBusy(false)
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Properties</h1>
        <Link href="/admin/properties/new">
          <button className="h-10 px-4 bg-primary hover:bg-teal-700 text-white font-semibold rounded-lg transition-all shadow-sm flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        </Link>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, location, agent..."
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
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">All Properties</h2>
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-2.5 py-1 rounded-md">
            {filteredSorted.length} shown • Page {currentPage} of {totalPages}
          </span>
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
                <TableHead><SortHeader label="Title" sortKeyVal="title" /></TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</TableHead>
                <TableHead><SortHeader label="Price" sortKeyVal="price" /></TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agent</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProperties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    {properties.length === 0 ? 'No properties found' : 'No properties match your search/filter'}
                  </TableCell>
                </TableRow>
              ) : paginatedProperties.map((property: any) => (
                <TableRow key={property.id} className={selectedIds.has(property.id) ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(property.id)}
                      onChange={() => toggleSelectOne(property.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-navy dark:text-white">
                    <div>{property.title}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-semibold">
                        {property.listing_type || 'Sale'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold">
                        {property.ownership || '1st Owner'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{property.location_address}</TableCell>
                  <TableCell className="font-medium text-sm">₹{property.price?.toLocaleString()}</TableCell>
                  <TableCell>
                    <select
                      value={property.status || 'available'}
                      onChange={(e) => handleStatusUpdate(property.id, e.target.value)}
                      className={`h-8 text-xs font-semibold rounded-lg px-2 border border-gray-200/60 dark:border-gray-800/60 focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[property.status] || 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300'}`}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{property.primary_agent?.name || 'Unassigned'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/properties/${property.slug || property.id}`} target="_blank">
                        <button className="text-primary hover:text-teal-700 font-medium text-xs transition-colors bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 h-8 px-2.5 rounded-md flex items-center gap-1" title="View Listing">
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </Link>
                      <Link href={`/admin/properties/${property.id}/edit`}>
                        <button className="text-navy dark:text-white hover:opacity-80 font-medium text-xs transition-colors bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 dark:hover:bg-navy-700 h-8 px-2.5 rounded-md flex items-center gap-1" title="Edit Property">
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(property.id, property.title)}
                        disabled={deletingId === property.id}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 font-medium text-xs transition-colors bg-red-50 dark:bg-red-950/40 hover:bg-red-100 h-8 px-2.5 rounded-md flex items-center gap-1 disabled:opacity-50"
                        title="Delete Property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
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
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredSorted.length)} of {filteredSorted.length} properties
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="w-8 h-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-navy-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-navy dark:text-white px-2">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="w-8 h-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-navy-800"
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
