'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getActivityLog } from './actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, ShieldCheck, Briefcase } from 'lucide-react'

const actionLabels: Record<string, string> = {
  delete_agent: 'Deleted agent',
  grant_agent_access: 'Granted portal access',
  revoke_agent_access: 'Revoked portal access',
  reset_agent_password: 'Reset agent password',
  reset_agent_2fa: 'Reset agent 2FA',
  set_agent_plan: 'Changed agent plan',
  set_lead_visibility: 'Changed lead visibility',
  delete_lead: 'Deleted lead',
  delete_user_profile: 'Deleted user',
  update_user_role: 'Changed user role',
  delete_property: 'Deleted property',
  update_plan_tier: 'Edited plan tier',
  delete_feedback: 'Deleted feedback message',
  update_lead_status: 'Updated lead status',
}

function actionLabel(action: string) {
  return actionLabels[action] || action.replace(/_/g, ' ')
}

function formatDetails(details: any): string {
  if (!details || typeof details !== 'object') return ''
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join(' · ')
}

export function ActivityLogClientWrapper({ initialLog }: { initialLog: any[] }) {
  const [log, setLog] = useState<any[]>(initialLog)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [actorFilter, setActorFilter] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    const refresh = async () => setLog(await getActivityLog())
    const channel = supabase
      .channel('activity_log_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filtered = useMemo(() => {
    let result = log
    if (actorFilter !== 'all') result = result.filter(l => l.actor?.role === actorFilter)
    if (debouncedQuery) {
      result = result.filter(l => {
        const haystack = [l.actor?.full_name, actionLabel(l.action), l.entity_type, formatDetails(l.details)]
          .filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(debouncedQuery)
      })
    }
    return result
  }, [log, actorFilter, debouncedQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Activity Log</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Every sensitive action taken by admins and agents — plan/role/visibility changes, deletions, access grants, lead status updates</p>
        </div>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{log.length} logged</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by person, action, or details..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Everyone</option>
          <option value="admin">Admins only</option>
          <option value="agent">Agents only</option>
        </select>
      </div>

      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
                  No activity found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${entry.actor?.role === 'admin' ? 'bg-teal-50 dark:bg-teal-950/40 text-primary' : 'bg-purple-50 text-purple-700'}`}>
                      {entry.actor?.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                      {entry.actor?.full_name || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-navy dark:text-white whitespace-nowrap">{actionLabel(entry.action)}</TableCell>
                  <TableCell className="text-xs text-gray-500 dark:text-gray-400">{formatDetails(entry.details)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
