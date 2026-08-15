'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import { Users, Building2, CheckCircle2, TrendingUp, Phone, MessageCircle, Crown, AlertTriangle, ArrowUpRight } from 'lucide-react'
import type { PlanStatus } from '@/lib/agent-plans'

const statusMeta: Record<string, { label: string; color: string; badge: string }> = {
  new: { label: 'New', color: '#3b82f6', badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' },
  contacted: { label: 'Contacted', color: '#f59e0b', badge: 'bg-amber-50 text-amber-700' },
  follow_up: { label: 'Follow Up', color: '#a855f7', badge: 'bg-purple-50 text-purple-700' },
  site_visit: { label: 'Site Visit', color: '#6366f1', badge: 'bg-indigo-50 text-indigo-700' },
  closed_won: { label: 'Closed Won', color: '#22c55e', badge: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400' },
  closed_lost: { label: 'Closed Lost', color: '#ef4444', badge: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' },
}

function toWaLink(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${withCountryCode}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-lg rounded-xl p-3 text-sm">
        <p className="font-semibold text-navy dark:text-white mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-gray-600 dark:text-gray-300">
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color || entry.fill }} />
            {entry.name}: <span className="font-semibold text-navy dark:text-white">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function AgentDashboardClient({ leads, properties, plan, profile }: {
  leads: any[]
  properties: any[]
  plan: PlanStatus | null
  profile: { name: string; company: string | null } | null
}) {
  const totalLeads = leads.length

  const newThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return leads.filter(l => new Date(l.created_at).getTime() >= weekAgo).length
  }, [leads])

  const closedWon = useMemo(() => leads.filter(l => l.status === 'closed_won').length, [leads])
  const conversionRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    leads.forEach(l => {
      const s = l.status || 'new'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts)
      .map(([status, value]) => ({ status, name: statusMeta[status]?.label || status, value, color: statusMeta[status]?.color || '#94a3b8' }))
      .sort((a, b) => b.value - a.value)
  }, [leads])

  // Real counts of leads received per day for the last 7 days — no fabricated
  // numbers, just a groupby on created_at.
  const weeklyTrend = useMemo(() => {
    const days: { key: string; day: string; leads: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({ key: d.toDateString(), day: d.toLocaleDateString('en-IN', { weekday: 'short' }), leads: 0 })
    }
    leads.forEach(l => {
      const key = new Date(l.created_at).toDateString()
      const bucket = days.find(d => d.key === key)
      if (bucket) bucket.leads += 1
    })
    return days
  }, [leads])

  const recentLeads = useMemo(() => leads.slice(0, 5), [leads])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">
            {profile ? `Welcome back, ${profile.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Here's how your leads and listings are doing</p>
        </div>
        {plan?.started && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${plan.expired ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-green-700 bg-green-50 dark:bg-green-950/40'}`}>
            {plan.expired ? <AlertTriangle className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
            {plan.tier.label}{plan.expired ? ' · Expired' : ''}
          </span>
        )}
      </div>

      {plan?.expired && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Your {plan.tier.label} has ended</p>
            <p className="text-xs text-red-600 dark:text-red-400/80">Renew or upgrade to get your leads and listings back.</p>
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

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} iconBg="bg-blue-50 dark:bg-blue-950/40" iconColor="text-blue-600 dark:text-blue-400" label="Total Leads" value={totalLeads.toString()} />
        <MetricCard icon={TrendingUp} iconBg="bg-teal-50 dark:bg-teal-950/40" iconColor="text-primary" label="New This Week" value={newThisWeek.toString()} />
        <MetricCard icon={CheckCircle2} iconBg="bg-green-50 dark:bg-green-950/40" iconColor="text-green-600 dark:text-green-400" label="Closed Won" value={closedWon.toString()} sublabel={totalLeads > 0 ? `${conversionRate}% conversion` : undefined} />
        <MetricCard icon={Building2} iconBg="bg-purple-50" iconColor="text-purple-600" label="My Properties" value={properties.length.toString()} />
      </div>

      {plan && !plan.expired && plan.tier.lead_cap != null && (
        <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm p-4">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            <span>Lead capacity used ({plan.tier.label})</span>
            <span className="font-bold text-navy dark:text-white">{totalLeads} / {plan.tier.lead_cap}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-navy-800">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${Math.min(100, (totalLeads / plan.tier.lead_cap) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Weekly trend + status breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Leads Received</h2>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">Last 7 days</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="leads" name="Leads" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm p-5">
          <h2 className="text-sm font-bold text-navy dark:text-white mb-5 uppercase tracking-wide">Lead Status</h2>
          <div className="h-[180px]">
            {statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {statusBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">No leads yet</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
            {statusBreakdown.map(item => (
              <div key={item.status} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.name}</span>
                <span className="text-xs font-bold text-navy dark:text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent leads */}
      <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Recent Leads</h2>
          <Link href="/agent/leads" className="text-sm font-medium text-primary hover:text-teal-700 transition-colors inline-flex items-center gap-0.5">
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-navy-800">
                <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Name</th>
                <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Property</th>
                <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Status</th>
                <th className="text-right font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">No leads assigned to you yet</td>
                </tr>
              ) : recentLeads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-navy-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-navy dark:text-white">{lead.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{lead.property?.title || 'General Enquiry'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta[lead.status || 'new']?.badge || 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300'}`}>
                      {statusMeta[lead.status || 'new']?.label || lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <a href={`tel:${lead.phone}`} className="text-navy dark:text-white hover:opacity-80 bg-gray-100 dark:bg-navy-800 h-8 px-2.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1" title="Call">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a href={toWaLink(lead.phone)} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 bg-green-50 dark:bg-green-950/40 hover:bg-green-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1" title="WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, sublabel }: {
  icon: any; iconBg: string; iconColor: string; label: string; value: string; sublabel?: string
}) {
  return (
    <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-navy dark:text-white">{value}</p>
            {sublabel && <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{sublabel}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
