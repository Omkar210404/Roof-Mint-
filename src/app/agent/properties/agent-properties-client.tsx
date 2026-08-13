'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getMyProperties } from '../actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'

const statusStyles: Record<string, string> = {
  available: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700',
  sold: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  reserved: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300',
  coming_soon: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
}

type SortKey = 'date' | 'title' | 'price'
type SortDir = 'asc' | 'desc'

export function AgentPropertiesClient({ initialProperties }: { initialProperties: any[] }) {
  const [properties, setProperties] = useState<any[]>(initialProperties)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const supabase = createClient()

  // Live updates: RLS still applies, but this list is already scoped by
  // primary_agent_id in the query, so a refetch is enough to stay current.
  useEffect(() => {
    const channel = supabase
      .channel('agent_properties_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, async () => {
        setProperties(await getMyProperties())
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
    let result = properties
    if (debouncedQuery) {
      result = result.filter(p => {
        const haystack = [p.title, p.city, p.locality, p.location_address].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(debouncedQuery)
      })
    }
    return [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (sortKey === 'price') cmp = (a.price || 0) - (b.price || 0)
      else cmp = (a.title || '').localeCompare(b.title || '')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [properties, debouncedQuery, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'title' ? 'asc' : 'desc') }
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
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">My Properties</h1>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{properties.length} total</span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, city, locality..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Assigned Listings</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">{filteredSorted.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Property</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</TableHead>
                <TableHead><SortHeader label="Price" sortKeyVal="price" /></TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Views</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Listing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    {properties.length === 0 ? 'No properties assigned to you yet' : 'No properties match your search'}
                  </TableCell>
                </TableRow>
              ) : filteredSorted.map((property: any) => {
                const cover = property.property_media?.find((m: any) => m.is_cover) || property.property_media?.[0]
                return (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {cover?.url && (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-navy-800">
                            <Image src={cover.url} alt={property.title} fill className="object-cover" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-navy dark:text-white text-sm">{property.title}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{property.bhk ? `${property.bhk} BHK · ` : ''}{property.property_type}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-xs">{property.locality}, {property.city}</TableCell>
                    <TableCell className="font-medium text-sm text-navy dark:text-white">₹{property.price?.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyles[property.status] || statusStyles.on_hold}`}>
                        {property.status?.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-gray-500 dark:text-gray-400">{property.views_count ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/properties/${property.slug}`}
                        target="_blank"
                        className="text-primary hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
