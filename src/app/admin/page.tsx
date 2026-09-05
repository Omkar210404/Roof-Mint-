'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, UsersRound, TrendingUp, ArrowUpRight, ArrowDownRight, Phone, Clock } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { getDashboardStats, getPropertyStatusCounts, getRecentEnquiries } from './actions';
import { LaunchAnniversaryBanner } from '@/components/launch-anniversary-banner';
import { FinancialBoard } from '@/components/financial-board';

const leadSources = [
  { source: 'Direct', count: 32 },
  { source: 'Google', count: 24 },
  { source: 'WhatsApp', count: 18 },
  { source: 'Referral', count: 12 },
  { source: 'Social', count: 8 },
];

const conversionFunnel = [
  { stage: 'Views', value: 1240 },
  { stage: 'Enquiries', value: 104 },
  { stage: 'Site Visits', value: 38 },
  { stage: 'Bookings', value: 12 },
];

// ── Fallback data for charts that require complex tracking (views etc) ──────
const weeklyActivity = [
  { day: 'Mon', views: 180, leads: 8 },
  { day: 'Tue', views: 220, leads: 12 },
  { day: 'Wed', views: 310, leads: 18 },
  { day: 'Thu', views: 260, leads: 14 },
  { day: 'Fri', views: 420, leads: 22 },
  { day: 'Sat', views: 380, leads: 19 },
  { day: 'Sun', views: 290, leads: 11 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-lg rounded-xl p-3 text-sm">
        <p className="font-semibold text-navy dark:text-white mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-gray-600 dark:text-gray-300">
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
            {entry.name}: <span className="font-semibold text-navy dark:text-white">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalProperties: 0, totalLeads: 0, activeAgents: 0, totalViews: 0 });
  const [statusCounts, setStatusCounts] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const supabase = createClient();

  const fetchDashboardData = async () => {
    const [newStats, newStatusCounts, newEnquiries] = await Promise.all([
      getDashboardStats(),
      getPropertyStatusCounts(),
      getRecentEnquiries()
    ]);

    setStats(newStats);
    setStatusCounts(newStatusCounts);
    setEnquiries(newEnquiries);
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to realtime changes on properties and enquiries tables
    const channel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Dashboard</h1>

      {/* ─── Launch Anniversary Banner ──────────────────────────────────── */}
      <LaunchAnniversaryBanner />

      {/* ─── Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Building2} iconBg="bg-teal-50 dark:bg-teal-950/40" iconColor="text-primary" label="Total Properties" value={stats.totalProperties.toString()} change="+4" up />
        <MetricCard icon={Users} iconBg="bg-blue-50 dark:bg-blue-950/40" iconColor="text-blue-600 dark:text-blue-400" label="Total Leads" value={stats.totalLeads.toString()} change="+18" up />
        <MetricCard icon={UsersRound} iconBg="bg-purple-50" iconColor="text-purple-600" label="Active Agents" value={stats.activeAgents.toString()} change="0" />
        <MetricCard icon={TrendingUp} iconBg="bg-green-50 dark:bg-green-950/40" iconColor="text-green-600 dark:text-green-400" label="Total Views" value={stats.totalViews.toLocaleString()} change="+12%" up />
      </div>

      {/* ─── Financial Board — track income, expenses, profit/loss ─────── */}
      <FinancialBoard />

      {/* ─── Row: Activity Chart + Property Status ─────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity Area Chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-navy dark:text-white">WEEKLY ACTIVITY</h2>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">Last 7 days</span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.20} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="views" stroke="#0d9488" strokeWidth={2.5} fill="url(#tealGrad)" name="Views" />
                <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2.5} fill="url(#blueGrad)" name="Leads" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="w-3 h-3 rounded-full bg-primary" /> Views
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="w-3 h-3 rounded-full bg-indigo-500" /> Leads
            </div>
          </div>
        </div>

        {/* Property Status Donut */}
        <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm p-5">
          <h2 className="text-sm font-bold text-navy dark:text-white mb-5 uppercase tracking-wide">Property Status</h2>
          <div className="h-[200px]">
            {statusCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusCounts}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {statusCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">No data</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {statusCounts.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.name}</span>
                <span className="text-xs font-bold text-navy dark:text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Row: Lead Sources + Conversion Funnel ─────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lead Sources Bar Chart */}
        <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm p-5">
          <h2 className="text-sm font-bold text-navy dark:text-white mb-5 uppercase tracking-wide">Lead Sources</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadSources} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="source" type="category" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Leads" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm p-5">
          <h2 className="text-sm font-bold text-navy dark:text-white mb-5 uppercase tracking-wide">Conversion Funnel</h2>
          <div className="space-y-4">
            {conversionFunnel.map((step, i) => {
              const widthPercent = (step.value / conversionFunnel[0].value) * 100;
              const colors = ['bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];
              const bgColors = ['bg-teal-50 dark:bg-teal-950/40', 'bg-blue-50 dark:bg-blue-950/40', 'bg-indigo-50', 'bg-purple-50'];
              return (
                <div key={step.stage}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{step.stage}</span>
                    <span className="text-sm font-bold text-navy dark:text-white">{step.value.toLocaleString()}</span>
                  </div>
                  <div className={`w-full h-3 rounded-full ${bgColors[i]}`}>
                    <div
                      className={`h-full rounded-full ${colors[i]} transition-all duration-700`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  {i < conversionFunnel.length - 1 && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 text-right">
                      {((conversionFunnel[i + 1].value / step.value) * 100).toFixed(1)}% conversion
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Recent Enquiries Table ────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Recent Enquiries</h2>
          <a href="/admin/leads" className="text-sm font-medium text-primary hover:text-teal-700 transition-colors">
            View all →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-navy-800">
                <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Name</th>
                <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Property</th>
                <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Contact</th>
                <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Time</th>
                <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">No enquiries found</td>
                </tr>
              ) : enquiries.map((enquiry) => (
                <tr key={enquiry.id} className="hover:bg-gray-50/50 dark:hover:bg-navy-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-navy dark:text-white">{enquiry.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{enquiry.property}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <Phone className="w-3.5 h-3.5" />
                      {enquiry.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {enquiry.time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={enquiry.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, change, up }: {
  icon: any; iconBg: string; iconColor: string; label: string; value: string; change: string; up?: boolean;
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
            {change && change !== '0' && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {change}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
    contacted: 'bg-amber-50 text-amber-700',
    closed: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}
