'use client'

import { useMemo } from 'react'
import { Database, Gauge, AlertTriangle, ShieldAlert, ExternalLink, MessageSquare } from 'lucide-react'

const SUPABASE_DB_LIMIT_BYTES = 500 * 1024 * 1024 // Free tier: 500MB

const VENDOR_LIMITS = [
  {
    name: 'Vercel (hosting)',
    tier: 'Hobby (free)',
    limits: '1M function calls/mo · 100GB data transfer/mo · 4 CPU-hrs/mo',
    tracked: 'Not pulled in — no API token wired up',
    dashboardUrl: 'https://vercel.com/dashboard',
    dashboardLabel: 'Vercel → your project → Usage tab',
  },
  {
    name: 'Supabase (database + auth)',
    tier: 'Free',
    limits: '500MB database · 1GB storage · 50k monthly active users · 5GB egress',
    tracked: 'DB size and row counts below are live, queried directly',
    dashboardUrl: 'https://supabase.com/dashboard',
    dashboardLabel: 'Supabase → your project → Reports/Usage',
  },
  {
    name: 'Google Gemini (AI concierge)',
    tier: 'Free',
    limits: 'Not published — varies by account, short-window cap (we hit it during testing: ~20 req, ~39s retry window)',
    tracked: 'Self-tracked below (every call this app makes goes through our own route)',
    dashboardUrl: 'https://aistudio.google.com/rate-limit',
    dashboardLabel: 'AI Studio → your API key → usage/rate-limit page',
  },
]

const METRIC_LABELS: Record<string, string> = {
  ai_chat_calls: 'AI concierge calls made',
  ai_chat_errors: 'AI concierge errors (model rejected/failed)',
  whatsapp_lead_anonymous: 'Anonymous WhatsApp leads captured',
  'rate_limited:chat': 'AI concierge — rate limit hit',
  'rate_limited:login': 'Login — rate limit hit',
  'rate_limited:signup': 'Signup — rate limit hit',
  'rate_limited:forgot-password': 'Password reset — rate limit hit',
  'rate_limited:whatsapp-lead': 'WhatsApp lead — rate limit hit',
  'rate_limited:account-delete': 'Account deletion — rate limit hit',
}

function metricLabel(metric: string) {
  return METRIC_LABELS[metric] || metric
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ROW_COUNT_LABELS: Record<string, string> = {
  profiles: 'User Profiles',
  properties: 'Properties',
  enquiries: 'Enquiries',
  activity_log: 'Activity Log',
  notifications: 'Notifications',
  bills: 'Bills',
}

export function TechnicalUsageClient({ data }: { data: { db_size_bytes: number; row_counts: Record<string, number>; daily_usage: { day: string; metric: string; count: number }[] } | null }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  }, [])

  const { today, last7d, last30d, allMetrics } = useMemo(() => {
    const today = new Map<string, number>()
    const last7d = new Map<string, number>()
    const last30d = new Map<string, number>()
    const allMetrics = new Set<string>()

    for (const row of data?.daily_usage || []) {
      allMetrics.add(row.metric)
      last30d.set(row.metric, (last30d.get(row.metric) || 0) + row.count)
      if (row.day >= sevenDaysAgo) last7d.set(row.metric, (last7d.get(row.metric) || 0) + row.count)
      if (row.day === todayStr) today.set(row.metric, (today.get(row.metric) || 0) + row.count)
    }

    return { today, last7d, last30d, allMetrics: Array.from(allMetrics).sort() }
  }, [data, sevenDaysAgo, todayStr])

  if (!data) {
    return (
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm p-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Couldn&apos;t load technical usage data.
      </div>
    )
  }

  const dbPct = Math.min(100, (data.db_size_bytes / SUPABASE_DB_LIMIT_BYTES) * 100)
  const aiCallsToday = today.get('ai_chat_calls') || 0
  const aiErrorsToday = today.get('ai_chat_errors') || 0
  const rateLimitHitsToday = allMetrics
    .filter(m => m.startsWith('rate_limited:'))
    .reduce((sum, m) => sum + (today.get(m) || 0), 0)

  return (
    <div className="space-y-6">
      {/* At-a-glance stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            <Database className="w-3.5 h-3.5" /> Database Size
          </div>
          <p className="text-2xl font-bold text-navy dark:text-white mt-1">{formatBytes(data.db_size_bytes)}</p>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-navy-800 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full ${dbPct > 80 ? 'bg-red-500' : dbPct > 50 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.max(dbPct, 1)}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{dbPct.toFixed(1)}% of 500MB free-tier cap</p>
        </div>

        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            <MessageSquare className="w-3.5 h-3.5" /> AI Calls Today
          </div>
          <p className="text-2xl font-bold text-navy dark:text-white mt-1">{aiCallsToday}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Gemini free-tier limit resets fast (short window) — watch this one closest</p>
        </div>

        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            <AlertTriangle className="w-3.5 h-3.5" /> AI Errors Today
          </div>
          <p className={`text-2xl font-bold mt-1 ${aiErrorsToday > 0 ? 'text-red-600 dark:text-red-400' : 'text-navy dark:text-white'}`}>{aiErrorsToday}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Spikes here usually mean the Gemini quota was hit</p>
        </div>

        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            <ShieldAlert className="w-3.5 h-3.5" /> Rate Limits Hit Today
          </div>
          <p className={`text-2xl font-bold mt-1 ${rateLimitHitsToday > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-navy dark:text-white'}`}>{rateLimitHitsToday}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Across login, signup, chat, WhatsApp, etc.</p>
        </div>
      </div>

      {/* Vendor reference */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" /> Free-Tier Services
          </h2>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {VENDOR_LIMITS.map(v => (
            <div key={v.name} className="p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              <div className="md:w-56 shrink-0">
                <p className="text-sm font-bold text-navy dark:text-white">{v.name}</p>
                <span className="inline-block mt-1 text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">{v.tier}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-300">{v.limits}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{v.tracked}</p>
              </div>
              <a
                href={v.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 h-9 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-navy-800 text-xs font-semibold text-navy dark:text-white flex items-center gap-1.5 whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {v.dashboardLabel}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Self-tracked usage breakdown */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
          <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Self-Tracked Usage</h2>
          </div>
          {allMetrics.length === 0 ? (
            <p className="p-5 text-sm text-gray-400 dark:text-gray-500">No tracked events yet — this fills in as the AI concierge, WhatsApp leads, and rate limits get used.</p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {allMetrics.map(metric => (
                <div key={metric} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{metricLabel(metric)}</span>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className="text-sm font-bold text-navy dark:text-white">{last7d.get(metric) || 0}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">7 days</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy dark:text-white">{last30d.get(metric) || 0}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">30 days</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row counts / growth proxy */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
          <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Table Row Counts</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {Object.entries(data.row_counts).map(([table, count]) => (
              <div key={table} className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{ROW_COUNT_LABELS[table] || table}</span>
                <span className="text-sm font-bold text-navy dark:text-white">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
