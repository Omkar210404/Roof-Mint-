'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
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
import { Search, ShieldCheck, Briefcase, ChevronDown, X } from 'lucide-react'

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

// Turns actor + action + details into a plain-English sentence, e.g.
// "Admin changed Abhijeet's role from user to admin" — falls back to the
// generic action label + raw field list when the specific fields it needs
// aren't present (older log entries recorded before a given action started
// including a target name).
function describeActivity(entry: any): string {
  const actor = entry.actor?.full_name || (entry.actor?.role === 'agent' ? 'An agent' : 'Admin')
  const d = entry.details || {}

  switch (entry.action) {
    case 'update_user_role':
      if (d.user_name && d.to) return `${actor} changed ${d.user_name}'s role from ${d.from || 'user'} to ${d.to}`
      break
    case 'delete_user_profile':
      if (d.user_name) return `${actor} deleted user ${d.user_name}`
      break
    case 'delete_lead':
      if (d.lead_name) return `${actor} deleted the lead from ${d.lead_name}`
      break
    case 'set_lead_visibility':
      if (d.lead_name) return `${actor} made ${d.lead_name}'s lead ${d.visible ? 'visible' : 'hidden'} to their agent`
      break
    case 'update_lead_status':
      if (d.lead_name && d.status) return `${actor} updated ${d.lead_name}'s lead status to "${d.status}"`
      break
    case 'delete_property':
      if (d.title) return `${actor} deleted the property "${d.title}"`
      break
    case 'update_plan_tier':
      if (d.id) return `${actor} edited the "${d.id}" plan tier`
      break
    case 'delete_agent':
      if (d.agent_name) return `${actor} deleted agent ${d.agent_name}`
      break
    case 'grant_agent_access':
      if (d.agent_name) return `${actor} granted portal access to ${d.agent_name}${d.email ? ` (${d.email})` : ''}`
      break
    case 'revoke_agent_access':
      if (d.agent_name) return `${actor} revoked portal access for ${d.agent_name}`
      break
    case 'reset_agent_password':
      if (d.agent_name) return `${actor} reset the password for ${d.agent_name}`
      break
    case 'reset_agent_2fa':
      if (d.agent_name) return `${actor} reset two-factor authentication for ${d.agent_name}`
      break
    case 'set_agent_plan':
      if (d.agent_name && d.plan) return `${actor} set ${d.agent_name}'s plan to ${d.plan}`
      break
    case 'delete_feedback':
      return `${actor} deleted a feedback message`
  }

  const details = formatDetails(d)
  return `${actor} — ${actionLabel(entry.action)}${details ? ` (${details})` : ''}`
}

export function ActivityLogClientWrapper({ initialLog }: { initialLog: any[] }) {
  const [log, setLog] = useState<any[]>(initialLog)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [actorFilter, setActorFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const dateRangeActive = !!(startDate && endDate)
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
        const haystack = [l.actor?.full_name, actionLabel(l.action), l.entity_type, formatDetails(l.details), describeActivity(l)]
          .filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(debouncedQuery)
      })
    }
    return result
  }, [log, actorFilter, dateRangeActive, startDate, endDate, debouncedQuery])

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
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined}
            className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
            className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {dateRangeActive && (
            <button
              onClick={() => { setStartDate(''); setEndDate('') }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Clear date range"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>What happened</TableHead>
              <TableHead className="text-right">Details</TableHead>
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
              filtered.map((entry) => {
                const isOpen = expandedId === entry.id
                return (
                  <Fragment key={entry.id}>
                    <TableRow className={isOpen ? 'border-b-0' : ''}>
                      <TableCell className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${entry.actor?.role === 'admin' ? 'bg-teal-50 dark:bg-teal-950/40 text-primary' : 'bg-purple-50 text-purple-700'}`}>
                          {entry.actor?.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                          {entry.actor?.full_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-navy dark:text-white">{describeActivity(entry)}</TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => setExpandedId(isOpen ? null : entry.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Details <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-gray-50 dark:bg-navy-800 border-t-0">
                          <div className="py-2 space-y-2">
                            <p className="text-sm font-semibold text-navy dark:text-white">{describeActivity(entry)}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
                              <div><span className="text-gray-400 dark:text-gray-500">Action:</span> <span className="text-navy dark:text-white font-medium">{actionLabel(entry.action)}</span></div>
                              <div><span className="text-gray-400 dark:text-gray-500">Full timestamp:</span> <span className="text-navy dark:text-white font-medium">{new Date(entry.created_at).toLocaleString('en-IN')}</span></div>
                              <div><span className="text-gray-400 dark:text-gray-500">Actor role:</span> <span className="text-navy dark:text-white font-medium">{entry.actor?.role || 'unknown'}</span></div>
                              <div><span className="text-gray-400 dark:text-gray-500">Entity type:</span> <span className="text-navy dark:text-white font-medium">{entry.entity_type || '—'}</span></div>
                              {entry.entity_id && (
                                <div className="col-span-2 sm:col-span-1"><span className="text-gray-400 dark:text-gray-500">Entity ID:</span> <span className="text-navy dark:text-white font-mono">{entry.entity_id}</span></div>
                              )}
                              {entry.details && typeof entry.details === 'object' && Object.entries(entry.details).map(([k, v]) => (
                                (v === null || v === undefined || v === '') ? null : (
                                  <div key={k}><span className="text-gray-400 dark:text-gray-500 capitalize">{k.replace(/_/g, ' ')}:</span> <span className="text-navy dark:text-white font-medium">{String(v)}</span></div>
                                )
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
