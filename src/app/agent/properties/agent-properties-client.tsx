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
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Crown, AlertTriangle } from 'lucide-react'
import type { PlanStatus } from '@/lib/agent-plans'

const statusStyles: Record<string, string> = {
  available: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700',
  sold: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  reserved: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300',
  coming_soon: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
}

type SortKey = 'date' | 'title' | 'price'
type SortDir = 'asc' | 'desc'

export function AgentPropertiesClient({ initialProperties, plan }: { initialProperties: any[]; plan: PlanStatus | null }) {
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
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">My Properties</h1>
        <div className="flex items-center gap-2">
          {plan && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${plan.expired ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-green-700 bg-green-50 dark:bg-green-950/40'}`}
              title="See exact days remaining under Plans in the sidebar"
            >
              {plan.expired ? <AlertTriangle className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
              {plan.tier.label}{plan.expired ? ' · Expired' : ''}
            </span>
          )}
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{properties.length} total</span>
        </div>
      </div>

      {plan?.expired && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Your {plan.tier.label} has ended</p>
            <p className="text-xs text-red-600 dark:text-red-400/80">Your plan period is over, so your properties are no longer shown here. Renew or upgrade to get access back.</p>
          </div>
          <a
            href="https://wa.me/917758839446?text=Hi%20Roofmint%2C%20my%20agent%20plan%20has%20ended%20and%20I%27d%20like%20to%20renew%20or%20upgrade."
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
          >
            Contact to Renew
          </a>
        </div>
      )}

      {plan && !plan.expired && plan.tier.property_cap != null && (
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
          {plan.tier.label} shows up to {plan.tier.property_cap} propert{plan.tier.property_cap === 1 ? 'y' : 'ies'}. Upgrade for more.
        </p>
      )}

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
