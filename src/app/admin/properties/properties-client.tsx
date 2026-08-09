'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react'
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

export function PropertiesClientWrapper({ initialProperties }: { initialProperties: any[] }) {
  const [properties, setProperties] = useState<any[]>(initialProperties)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const pageSize = 5
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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete property "${title}"?`)) return
    setDeletingId(id)
    setProperties(prev => prev.filter(p => p.id !== id))
    await deleteProperty(id)
    setDeletingId(null)
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
    await updatePropertyStatus(id, newStatus)
  }

  const totalPages = Math.ceil(properties.length / pageSize) || 1
  const paginatedProperties = properties.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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

      <div className="bg-white dark:bg-navy-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">All Properties</h2>
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-2.5 py-1 rounded-md">
            {properties.length} total • Page {currentPage} of {totalPages}
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agent</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProperties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">No properties found</TableCell>
                </TableRow>
              ) : paginatedProperties.map((property: any) => (
                <TableRow key={property.id}>
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
                      className={`h-8 text-xs font-semibold rounded-lg px-2 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[property.status] || 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300'}`}
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="on_hold">On Hold</option>
                      <option value="coming_soon">Coming Soon</option>
                      <option value="sold">Sold</option>
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
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, properties.length)} of {properties.length} properties
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
