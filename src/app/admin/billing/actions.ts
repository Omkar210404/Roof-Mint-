'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { logActivity } from '@/utils/supabase/activity-log'
import { revalidatePath } from 'next/cache'

export async function getBills() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('getBills error:', error.message)
    return []
  }

  return data || []
}

export async function getBillWithItems(id: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return null

  const { data: bill, error } = await supabase.from('bills').select('*').eq('id', id).single()
  if (error || !bill) return null

  const { data: items } = await supabase
    .from('bill_items')
    .select('*')
    .eq('bill_id', id)
    .order('sort_order', { ascending: true })

  return { ...bill, items: items || [] }
}

export async function getAgentsForBilling() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []

  const { data } = await supabase
    .from('agents')
    .select('id, name, company, phone, email')
    .order('name')

  return data || []
}

export interface BillLineItem {
  description: string
  amount: number
}

export async function createBill(input: {
  bill_to_type: 'agent' | 'manual'
  agent_id: string | null
  bill_to_name: string
  bill_to_company: string | null
  bill_to_phone: string | null
  bill_to_email: string | null
  bill_to_address: string | null
  issue_date: string
  due_date: string | null
  notes: string | null
  items: BillLineItem[]
}) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  if (!input.bill_to_name.trim()) return { error: 'Bill-to name is required.' }
  const items = input.items.filter(i => i.description.trim() && i.amount > 0)
  if (items.length === 0) return { error: 'Add at least one line item with a description and amount.' }

  const total = items.reduce((sum, i) => sum + i.amount, 0)

  const { data: bill, error } = await supabase
    .from('bills')
    .insert({
      bill_to_type: input.bill_to_type,
      agent_id: input.agent_id,
      bill_to_name: input.bill_to_name.trim(),
      bill_to_company: input.bill_to_company?.trim() || null,
      bill_to_phone: input.bill_to_phone?.trim() || null,
      bill_to_email: input.bill_to_email?.trim() || null,
      bill_to_address: input.bill_to_address?.trim() || null,
      issue_date: input.issue_date,
      due_date: input.due_date || null,
      notes: input.notes?.trim() || null,
      total,
      created_by: user!.id,
    })
    .select('id, bill_number')
    .single()

  if (error || !bill) {
    console.error('createBill error:', error?.message)
    return { error: error?.message || 'Failed to create bill.' }
  }

  const itemRows = items.map((item, i) => ({
    bill_id: bill.id,
    description: item.description.trim(),
    amount: item.amount,
    sort_order: i,
  }))
  const { error: itemsError } = await supabase.from('bill_items').insert(itemRows)

  if (itemsError) {
    console.error('createBill items error:', itemsError.message)
    return { error: 'Bill created but failed to save line items: ' + itemsError.message }
  }

  await logActivity(supabase, user!.id, 'create_bill', 'bill', bill.id, {
    bill_number: bill.bill_number,
    bill_to_name: input.bill_to_name.trim(),
    total,
  })

  revalidatePath('/admin/billing')
  return { success: true, id: bill.id, bill_number: bill.bill_number }
}

export async function updateBillStatus(id: string, status: 'unpaid' | 'paid' | 'cancelled') {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { data: bill } = await supabase.from('bills').select('bill_number, bill_to_name').eq('id', id).single()

  const { error } = await supabase
    .from('bills')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('updateBillStatus error:', error.message)
    return { error: error.message }
  }

  await logActivity(supabase, user!.id, 'update_bill_status', 'bill', id, {
    bill_number: bill?.bill_number,
    bill_to_name: bill?.bill_to_name,
    status,
  })

  revalidatePath('/admin/billing')
  return { success: true }
}

export async function deleteBill(id: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { data: bill } = await supabase.from('bills').select('bill_number, bill_to_name').eq('id', id).single()

  // FK cascade removes the associated bill_items.
  const { error } = await supabase.from('bills').delete().eq('id', id)

  if (error) {
    console.error('deleteBill error:', error.message)
    return { error: error.message }
  }

  await logActivity(supabase, user!.id, 'delete_bill', 'bill', id, {
    bill_number: bill?.bill_number,
    bill_to_name: bill?.bill_to_name,
  })

  revalidatePath('/admin/billing')
  return { success: true }
}
