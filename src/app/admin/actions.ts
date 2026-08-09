'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'

export async function getDashboardStats() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { totalProperties: 0, totalLeads: 0, activeAgents: 0, totalViews: 0 }

  const [propertiesRes, leadsRes, agentsRes] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('enquiries').select('*', { count: 'exact', head: true }),
    supabase.from('agents').select('*', { count: 'exact', head: true })
  ])

  return {
    totalProperties: propertiesRes.count || 0,
    totalLeads: leadsRes.count || 0,
    activeAgents: agentsRes.count || 0,
    totalViews: 0
  }
}

export async function getPropertyStatusCounts() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []

  const { data } = await supabase
    .from('properties')
    .select('status')

  if (!data || data.length === 0) return []

  const counts = data.reduce((acc: Record<string, number>, curr) => {
    const s = curr.status || 'available'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const colors: Record<string, string> = {
    available: '#0d9488',
    sold: '#6366f1',
    reserved: '#f59e0b',
    on_hold: '#94a3b8',
    coming_soon: '#3b82f6'
  }

  return Object.keys(counts).map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    value: counts[status],
    color: colors[status] || '#cbd5e1'
  }))
}

export async function getRecentEnquiries() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []

  const { data } = await supabase
    .from('enquiries')
    .select(`
      id, 
      name, 
      phone, 
      created_at, 
      status,
      property:properties(title)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!data) return []

  return data.map((enq: any) => ({
    id: enq.id,
    name: enq.name,
    property: enq.property?.title || 'General Enquiry',
    phone: enq.phone,
    time: new Date(enq.created_at).toLocaleString(),
    status: enq.status
  }))
}
