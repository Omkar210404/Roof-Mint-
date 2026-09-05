'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { logActivity } from '@/utils/supabase/activity-log'
import { revalidatePath } from 'next/cache'

export async function getFinancialTransactions() {
    const { authorized, supabase } = await requireAdmin()
    if (!authorized) return []

    const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) {
        console.warn('getFinancialTransactions error:', error.message)
        return []
    }

    return data || []
}

export async function getFinancialSummary() {
    const { authorized, supabase } = await requireAdmin()
    if (!authorized) return { totalIncome: 0, totalExpense: 0, totalMisc: 0, net: 0 }

    const { data, error } = await supabase
        .from('financial_transactions')
        .select('type, amount')

    if (error || !data) {
        console.warn('getFinancialSummary error:', error?.message)
        return { totalIncome: 0, totalExpense: 0, totalMisc: 0, net: 0 }
    }

    let totalIncome = 0
    let totalExpense = 0
    let totalMisc = 0

    data.forEach(t => {
        const amt = Number(t.amount) || 0
        if (t.type === 'income') totalIncome += amt
        else if (t.type === 'expense') totalExpense += amt
        else totalMisc += amt
    })

    return {
        totalIncome,
        totalExpense,
        totalMisc,
        net: totalIncome - totalExpense,
    }
}

export async function createFinancialTransaction(input: {
    type: 'income' | 'expense' | 'misc'
    category: string
    description: string
    amount: number
    transaction_date: string
}) {
    const { authorized, supabase, user } = await requireAdmin()
    if (!authorized) return { error: 'Unauthorized' }

    const description = input.description.trim()
    const category = input.category.trim() || 'general'
    const amount = Number(input.amount) || 0

    if (!description) return { error: 'Description is required.' }
    if (amount <= 0) return { error: 'Amount must be greater than zero.' }

    const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
            type: input.type,
            category,
            description,
            amount,
            transaction_date: input.transaction_date,
            created_by: user!.id,
        })
        .select('id, description, amount, type')
        .single()

    if (error || !data) {
        console.error('createFinancialTransaction error:', error?.message)
        return { error: error?.message || 'Failed to add transaction.' }
    }

    await logActivity(supabase, user!.id, 'create_financial_transaction', 'financial_transaction', data.id, {
        type: data.type,
        description: data.description,
        amount: data.amount,
    })

    revalidatePath('/admin')
    return { success: true, id: data.id }
}

export async function updateFinancialTransaction(id: string, input: {
    type: 'income' | 'expense' | 'misc'
    category: string
    description: string
    amount: number
    transaction_date: string
}) {
    const { authorized, supabase, user } = await requireAdmin()
    if (!authorized) return { error: 'Unauthorized' }

    const description = input.description.trim()
    const category = input.category.trim() || 'general'
    const amount = Number(input.amount) || 0

    if (!description) return { error: 'Description is required.' }
    if (amount <= 0) return { error: 'Amount must be greater than zero.' }

    const { data: existing } = await supabase
        .from('financial_transactions')
        .select('description, amount, type')
        .eq('id', id)
        .single()

    const { error } = await supabase
        .from('financial_transactions')
        .update({
            type: input.type,
            category,
            description,
            amount,
            transaction_date: input.transaction_date,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (error) {
        console.error('updateFinancialTransaction error:', error.message)
        return { error: error.message }
    }

    await logActivity(supabase, user!.id, 'update_financial_transaction', 'financial_transaction', id, {
        type: input.type,
        description,
        amount,
        previous: existing,
    })

    revalidatePath('/admin')
    return { success: true }
}

export async function deleteFinancialTransaction(id: string) {
    const { authorized, supabase, user } = await requireAdmin()
    if (!authorized) return { error: 'Unauthorized' }

    const { data: existing } = await supabase
        .from('financial_transactions')
        .select('description, amount, type')
        .eq('id', id)
        .single()

    const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('deleteFinancialTransaction error:', error.message)
        return { error: error.message }
    }

    await logActivity(supabase, user!.id, 'delete_financial_transaction', 'financial_transaction', id, {
        type: existing?.type,
        description: existing?.description,
        amount: existing?.amount,
    })

    revalidatePath('/admin')
    return { success: true }
}