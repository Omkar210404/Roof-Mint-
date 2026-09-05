'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    getFinancialTransactions,
    createFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction,
} from '@/app/admin/financial/actions'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Plus, Pencil, Trash2, TrendingUp, TrendingDown, Wallet, MoreHorizontal,
    X, Check, Loader2, IndianRupee, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

const typeMeta: Record<string, { label: string; badge: string; icon: any }> = {
    income: { label: 'Income', badge: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400', icon: TrendingUp },
    expense: { label: 'Expense', badge: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400', icon: TrendingDown },
    misc: { label: 'Misc', badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400', icon: MoreHorizontal },
}

function formatINR(n: number) {
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const inputCls = "w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
const labelCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"

export function FinancialBoard() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [editing, setEditing] = useState<any | null>(null)
    const [typeFilter, setTypeFilter] = useState('all')
    const supabase = createClient()

    const fetchTransactions = async () => {
        const data = await getFinancialTransactions()
        setTransactions(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchTransactions()

        const channel = supabase
            .channel('financial_board_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_transactions' }, () => {
                fetchTransactions()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    // Compute summary and dispatch a custom event so the banner can listen
    const summary = useMemo(() => {
        let totalIncome = 0
        let totalExpense = 0
        let totalMisc = 0
        transactions.forEach(t => {
            const amt = Number(t.amount) || 0
            if (t.type === 'income') totalIncome += amt
            else if (t.type === 'expense') totalExpense += amt
            else totalMisc += amt
        })
        return { totalIncome, totalExpense, totalMisc, net: totalIncome - totalExpense }
    }, [transactions])

    // Dispatch the net total to the banner via a custom window event
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('financial-summary-updated', {
            detail: { net: summary.net, totalIncome: summary.totalIncome, totalExpense: summary.totalExpense },
        }))
    }, [summary])

    const filtered = useMemo(() => {
        if (typeFilter === 'all') return transactions
        return transactions.filter(t => t.type === typeFilter)
    }, [transactions, typeFilter])

    const handleDelete = async (id: string, description: string) => {
        if (!confirm(`Delete "${description}"? This cannot be undone.`)) return
        setTransactions(prev => prev.filter(t => t.id !== id))
        await deleteFinancialTransaction(id)
    }

    const handleAdded = async () => {
        await fetchTransactions()
        setShowAdd(false)
    }

    const handleUpdated = async () => {
        await fetchTransactions()
        setEditing(null)
    }

    return (
        <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
                <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" /> Financial Board
                </h2>
                <div className="flex items-center gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-8 text-xs font-medium bg-gray-50 dark:bg-navy-800 border border-gray-200/60 dark:border-gray-800/60 rounded-lg px-2 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                        <option value="misc">Misc</option>
                    </select>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="h-8 px-3 rounded-lg bg-primary hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 pb-0">
                <SummaryCard
                    label="Total Income"
                    value={formatINR(summary.totalIncome)}
                    icon={TrendingUp}
                    iconBg="bg-green-50 dark:bg-green-950/40"
                    iconColor="text-green-600 dark:text-green-400"
                />
                <SummaryCard
                    label="Total Expenses"
                    value={formatINR(summary.totalExpense)}
                    icon={TrendingDown}
                    iconBg="bg-red-50 dark:bg-red-950/40"
                    iconColor="text-red-600 dark:text-red-400"
                />
                <SummaryCard
                    label="Miscellaneous"
                    value={formatINR(summary.totalMisc)}
                    icon={MoreHorizontal}
                    iconBg="bg-purple-50 dark:bg-purple-950/40"
                    iconColor="text-purple-600 dark:text-purple-400"
                />
                <div className={`rounded-xl p-4 border ${summary.net >= 0 ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${summary.net >= 0 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                            {summary.net >= 0
                                ? <ArrowUpRight className={`w-5 h-5 ${summary.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                                : <ArrowDownRight className={`w-5 h-5 ${summary.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Net Profit / Loss</h3>
                            <p className={`text-lg font-bold mt-0.5 ${summary.net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {summary.net >= 0 ? '+' : ''}{formatINR(summary.net)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="p-5">
                {loading ? (
                    <div className="py-10 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                        {transactions.length === 0 ? 'No transactions yet — add your first income or expense.' : 'No transactions match this filter.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((t: any) => {
                                    const meta = typeMeta[t.type] || typeMeta.misc
                                    const TypeIcon = meta.icon
                                    return (
                                        <TableRow key={t.id}>
                                            <TableCell className="align-top py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                {new Date(t.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell className="align-top py-3">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${meta.badge}`}>
                                                    <TypeIcon className="w-3 h-3" /> {meta.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="align-top py-3 text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                {t.category}
                                            </TableCell>
                                            <TableCell className="align-top py-3 text-sm font-medium text-navy dark:text-white">
                                                {t.description}
                                            </TableCell>
                                            <TableCell className={`align-top py-3 text-right text-sm font-bold whitespace-nowrap ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : t.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                                {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}{formatINR(Number(t.amount) || 0)}
                                            </TableCell>
                                            <TableCell className="align-top py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setEditing(t)}
                                                        className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(t.id, t.description)}
                                                        className="w-8 h-8 rounded-md bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 flex items-center justify-center"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {showAdd && (
                <TransactionModal
                    onClose={() => setShowAdd(false)}
                    onSaved={handleAdded}
                />
            )}

            {editing && (
                <TransactionModal
                    transaction={editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleUpdated}
                />
            )}
        </div>
    )
}

function SummaryCard({ label, value, icon: Icon, iconBg, iconColor }: {
    label: string
    value: string
    icon: any
    iconBg: string
    iconColor: string
}) {
    return (
        <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 p-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</h3>
                    <p className="text-lg font-bold text-navy dark:text-white mt-0.5 truncate">{value}</p>
                </div>
            </div>
        </div>
    )
}

function TransactionModal({ transaction, onClose, onSaved }: {
    transaction?: any
    onClose: () => void
    onSaved: () => void
}) {
    const [type, setType] = useState<'income' | 'expense' | 'misc'>(transaction?.type || 'income')
    const [category, setCategory] = useState(transaction?.category || '')
    const [description, setDescription] = useState(transaction?.description || '')
    const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
    const [date, setDate] = useState(transaction?.transaction_date || new Date().toISOString().slice(0, 10))
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        const payload = {
            type,
            category: category || 'general',
            description,
            amount: Number(amount) || 0,
            transaction_date: date,
        }

        const res = transaction
            ? await updateFinancialTransaction(transaction.id, payload)
            : await createFinancialTransaction(payload)

        if (res?.error) {
            setError(res.error)
            setSubmitting(false)
            return
        }

        setSubmitting(false)
        onSaved()
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="h-14 px-6 border-b border-gray-100/60 dark:border-gray-800/60 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-primary" />
                        {transaction ? 'Edit Transaction' : 'Add Transaction'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Type selector */}
                    <div className="space-y-1">
                        <label className={labelCls}>Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['income', 'expense', 'misc'] as const).map(t => {
                                const meta = typeMeta[t]
                                const Icon = meta.icon
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className={`h-10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${type === t ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300'}`}
                                    >
                                        <Icon className="w-3.5 h-3.5" /> {meta.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className={labelCls}>Amount (₹) *</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0"
                                className={inputCls}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Date</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className={labelCls}>Category</label>
                        <input
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            placeholder="e.g. Commission, Marketing, Office Rent"
                            className={inputCls}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className={labelCls}>Description *</label>
                        <input
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What is this for?"
                            className={inputCls}
                        />
                    </div>

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-11 border border-gray-200/60 dark:border-gray-800/60 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 h-11 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {submitting ? 'Saving...' : transaction ? 'Save Changes' : 'Add Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}