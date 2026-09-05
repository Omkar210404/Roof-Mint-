'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    getFinancialTransactions,
    createFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction,
} from './actions'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Plus, Pencil, Trash2, TrendingUp, TrendingDown, MoreHorizontal,
    X, Check, Loader2, IndianRupee, ArrowUpRight, ArrowDownRight, Search,
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

export function FinancialClientWrapper({ initialTransactions }: { initialTransactions: any[] }) {
    const [transactions, setTransactions] = useState<any[]>(initialTransactions)
    const [loading, setLoading] = useState(false)
    const [showAdd, setShowAdd] = useState(false)
    const [editing, setEditing] = useState<any | null>(null)
    const [typeFilter, setTypeFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const supabase = createClient()

    const fetchTransactions = async () => {
        const data = await getFinancialTransactions()
        setTransactions(data)
        setLoading(false)
    }

    useEffect(() => {
        const channel = supabase
            .channel('financial_page_changes')
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
        let result = transactions
        if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter)
        const q = searchQuery.trim().toLowerCase()
        if (q) {
            result = result.filter(t =>
                t.description.toLowerCase().includes(q) ||
                (t.category || '').toLowerCase().includes(q)
            )
        }
        return result
    }, [transactions, typeFilter, searchQuery])

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
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy dark:text-white">Finance Board</h1>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Track every income, expense, and miscellaneous entry</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="h-9 sm:h-10 px-3 sm:px-4 bg-primary hover:bg-teal-700 text-white font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap shrink-0"
                >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add Transaction
                </button>
            </div>

            {/* Summary Cards — 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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
                <div className={`rounded-xl border p-3 sm:p-5 ${summary.net >= 0 ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900'}`}>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${summary.net >= 0 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                            {summary.net >= 0
                                ? <ArrowUpRight className={`w-4 h-4 sm:w-6 sm:h-6 ${summary.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                                : <ArrowDownRight className={`w-4 h-4 sm:w-6 sm:h-6 ${summary.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[10px] sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">Net Profit / Loss</h3>
                            <p className={`text-sm sm:text-2xl font-bold mt-0.5 sm:mt-1 truncate ${summary.net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {summary.net >= 0 ? '+' : ''}{formatINR(summary.net)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by description or category..."
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1 sm:flex-none"
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                        <option value="misc">Misc</option>
                    </select>
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full whitespace-nowrap inline-flex items-center shrink-0">
                        {transactions.length} total
                    </span>
                </div>
            </div>

            {/* Transactions — Mobile: card list, Desktop: table */}
            {loading ? (
                <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl py-10 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl py-10 text-center text-sm text-gray-400 dark:text-gray-500 px-4">
                    {transactions.length === 0 ? 'No transactions yet — add your first income or expense.' : 'No transactions match your search/filter.'}
                </div>
            ) : (
                <>
                    {/* Mobile: card list */}
                    <div className="sm:hidden space-y-3">
                        {filtered.map((t: any) => {
                            const meta = typeMeta[t.type] || typeMeta.misc
                            const TypeIcon = meta.icon
                            const isIncome = t.type === 'income'
                            const isExpense = t.type === 'expense'
                            return (
                                <div key={t.id} className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${meta.badge}`}>
                                                    <TypeIcon className="w-3 h-3" /> {meta.label}
                                                </span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                                    {new Date(t.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold text-navy dark:text-white mt-1.5 break-words">{t.description}</p>
                                            {t.category && t.category !== 'general' && (
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 capitalize">{t.category}</p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-base font-bold whitespace-nowrap ${isIncome ? 'text-green-600 dark:text-green-400' : isExpense ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                                {isIncome ? '+' : isExpense ? '−' : ''}{formatINR(Number(t.amount) || 0)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-50 dark:border-gray-800/60">
                                        <button
                                            onClick={() => setEditing(t)}
                                            className="h-8 px-3 rounded-md bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-semibold inline-flex items-center gap-1.5"
                                        >
                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id, t.description)}
                                            className="h-8 px-3 rounded-md bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 text-xs font-semibold inline-flex items-center gap-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden sm:block bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
                        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">All Transactions</h2>
                        </div>
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
                    </div>
                </>
            )}

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
        <div className="rounded-xl border border-gray-100/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 shadow-sm hover:shadow-md transition-shadow p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-4">
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-[10px] sm:text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">{label}</h3>
                    <p className="text-sm sm:text-2xl font-bold text-navy dark:text-white mt-0.5 sm:mt-1 truncate">{value}</p>
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
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-navy-900 rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white dark:bg-navy-900 h-14 px-4 sm:px-6 border-b border-gray-100/60 dark:border-gray-800/60 flex items-center justify-between z-10">
                    <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-primary" />
                        {transaction ? 'Edit Transaction' : 'Add Transaction'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
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