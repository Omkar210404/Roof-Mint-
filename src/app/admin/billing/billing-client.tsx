'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search, Plus, X, FileText, Download, Share2, Trash2, Receipt,
  User, Building2, Loader2, Check, Plus as PlusIcon, Trash, CreditCard, Pencil,
  ShieldCheck, ShieldAlert,
} from 'lucide-react'
import { getBills, getBillWithItems, createBill, updateBillStatus, deleteBill, verifyBill } from './actions'
import { buildBillPdf, billFileName } from '@/lib/generate-bill-pdf'
import { formatPlanDuration, formatPlanPrice, type AgentPlanTier } from '@/lib/agent-plans'

const statusStyles: Record<string, string> = {
  unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
  cancelled: 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400 border-gray-200/60 dark:border-gray-800/60',
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type Agent = { id: string; name: string; company: string | null; phone: string | null; email: string | null }

export function BillingClientWrapper({ initialBills, agents, planTiers }: { initialBills: any[]; agents: Agent[]; planTiers: AgentPlanTier[] }) {
  const [bills, setBills] = useState<any[]>(initialBills)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('bills_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, async () => {
        setBills(await getBills())
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const filtered = useMemo(() => {
    let result = bills
    if (statusFilter !== 'all') result = result.filter(b => b.status === statusFilter)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(b =>
        b.bill_number.toLowerCase().includes(q) || b.bill_to_name.toLowerCase().includes(q)
      )
    }
    return result
  }, [bills, statusFilter, searchQuery])

  const downloadBill = async (id: string) => {
    setBusyId(id)
    const bill = await getBillWithItems(id)
    if (bill) {
      const doc = await buildBillPdf(bill)
      doc.save(billFileName(bill.bill_number))
    }
    setBusyId(null)
  }

  const shareBill = async (id: string) => {
    setBusyId(id)
    const bill = await getBillWithItems(id)
    if (bill) {
      const doc = await buildBillPdf(bill)
      const blob = doc.output('blob')
      const file = new File([blob], billFileName(bill.bill_number), { type: 'application/pdf' })
      if (typeof navigator !== 'undefined' && (navigator as any).canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: bill.bill_number, text: `Invoice ${bill.bill_number} from Roofmint` })
          setBusyId(null)
          return
        } catch {}
      }
      // Fall back to a plain download if the Web Share API (or file
      // sharing specifically) isn't supported on this browser/device.
      doc.save(billFileName(bill.bill_number))
    }
    setBusyId(null)
  }

  const handleDelete = async (id: string, billNumber: string) => {
    if (!confirm(`Delete bill ${billNumber}? This cannot be undone.`)) return
    setBills(prev => prev.filter(b => b.id !== id))
    await deleteBill(id)
  }

  const changeStatus = async (id: string, next: 'unpaid' | 'paid' | 'cancelled') => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, status: next } : b))
    await updateBillStatus(id, next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Billing</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generate, track, and download bills for agents or manual recipients</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVerifyModal(true)}
            className="h-10 px-4 border border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-navy-800 text-navy dark:text-white font-semibold rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <ShieldCheck className="w-4 h-4 text-primary" /> Verify Bill
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-10 px-4 bg-primary hover:bg-teal-700 text-white font-semibold rounded-lg transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> New Bill
          </button>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{bills.length} total</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by bill number or name..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm font-medium text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill #</TableHead>
              <TableHead>Bill To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
                  {bills.length === 0 ? 'No bills yet — create your first one.' : 'No bills match your search/filter.'}
                </TableCell>
              </TableRow>
            ) : filtered.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="align-top py-3 font-mono text-xs font-semibold text-navy dark:text-white whitespace-nowrap">{bill.bill_number}</TableCell>
                <TableCell className="align-top py-3">
                  <div className="text-sm font-medium text-navy dark:text-white">{bill.bill_to_name}</div>
                  {bill.bill_to_company && <div className="text-xs text-gray-400 dark:text-gray-500">{bill.bill_to_company}</div>}
                </TableCell>
                <TableCell className="align-top py-3 text-sm font-semibold text-navy dark:text-white whitespace-nowrap">{formatINR(bill.total)}</TableCell>
                <TableCell className="align-top py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(bill.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="align-top py-3">
                  <select
                    value={bill.status}
                    onChange={(e) => changeStatus(bill.id, e.target.value as 'unpaid' | 'paid' | 'cancelled')}
                    className={`text-xs font-bold pl-2.5 pr-6 py-1 rounded-lg border capitalize focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[bill.status]}`}
                  >
                    <option value="unpaid" className="bg-white text-gray-900">Unpaid</option>
                    <option value="paid" className="bg-white text-gray-900">Paid</option>
                    <option value="cancelled" className="bg-white text-gray-900">Cancelled</option>
                  </select>
                </TableCell>
                <TableCell className="align-top py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => downloadBill(bill.id)}
                      disabled={busyId === bill.id}
                      title="Download PDF"
                      className="w-8 h-8 rounded-md bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 dark:hover:bg-navy-700 text-navy dark:text-white flex items-center justify-center disabled:opacity-40"
                    >
                      {busyId === bill.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => shareBill(bill.id)}
                      disabled={busyId === bill.id}
                      title="Share PDF"
                      className="w-8 h-8 rounded-md bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-primary flex items-center justify-center disabled:opacity-40"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(bill.id, bill.bill_number)}
                      title="Delete bill"
                      className="w-8 h-8 rounded-md bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showCreateModal && (
        <CreateBillModal
          agents={agents}
          planTiers={planTiers}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => setBills(await getBills())}
        />
      )}

      {showVerifyModal && (
        <VerifyBillModal onClose={() => setShowVerifyModal(false)} />
      )}
    </div>
  )
}

function VerifyBillModal({ onClose }: { onClose: () => void }) {
  const [billNumber, setBillNumber] = useState('')
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof verifyBill>> | null>(null)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setChecking(true)
    setResult(null)
    const res = await verifyBill(billNumber, code)
    setResult(res)
    setChecking(false)
  }

  const inputCls = "w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-sm w-full shadow-2xl">
        <div className="h-14 px-6 border-b border-gray-100/60 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Verify Bill
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCheck} className="p-6 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter the bill number and the small "Ref" code printed at the bottom of the PDF someone has shown you. It'll only match if both came from a genuine, unedited Roofmint bill.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bill Number</label>
            <input required value={billNumber} onChange={e => setBillNumber(e.target.value)} placeholder="RM-INV-000001" className={inputCls + ' font-mono'} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ref Code</label>
            <input required value={code} onChange={e => setCode(e.target.value)} placeholder="From the bottom of the PDF" className={inputCls + ' font-mono uppercase'} />
          </div>

          <button type="submit" disabled={checking} className="w-full h-11 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {checking ? 'Checking...' : 'Check'}
          </button>

          {result && (
            result.verified ? (
              <div className="p-3.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-xl space-y-1">
                <p className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Genuine — matches our records
                </p>
                <p className="text-xs text-green-800 dark:text-green-300">
                  {result.bill.bill_to_name} · {formatINR(result.bill.total)} · {new Date(result.bill.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {result.bill.status}
                </p>
                <p className="text-[11px] text-green-700/80 dark:text-green-400/80">Compare these details against what's being shown to you.</p>
              </div>
            ) : (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl">
                <p className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Not verified
                </p>
                <p className="text-xs text-red-700/90 dark:text-red-400/90 mt-0.5">
                  {result.reason === 'no_such_bill'
                    ? "No bill exists with that number — it wasn't issued by Roofmint."
                    : 'That bill number exists, but the code doesn\'t match our records.'}
                </p>
              </div>
            )
          )}
        </form>
      </div>
    </div>
  )
}

// A line item is either tied to one of the agent plan tiers (picking one
// auto-fills description + amount from that plan, still editable after —
// e.g. for a prorated or discounted amount) or a free-form custom charge.
// This distinction only exists client-side to drive the auto-fill; what
// actually gets saved is just the resulting description + amount.
type DraftItem = { mode: 'plan' | 'custom'; planId: string; description: string; amount: number }

function CreateBillModal({ agents, planTiers, onClose, onCreated }: { agents: Agent[]; planTiers: AgentPlanTier[]; onClose: () => void; onCreated: () => void }) {
  const [billToType, setBillToType] = useState<'agent' | 'manual'>('agent')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ mode: 'custom', planId: '', description: '', amount: 0 }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [createdBillId, setCreatedBillId] = useState<string | null>(null)
  const [createdBillNumber, setCreatedBillNumber] = useState<string | null>(null)

  const selectAgent = (agentId: string) => {
    setSelectedAgentId(agentId)
    const agent = agents.find(a => a.id === agentId)
    if (agent) {
      setName(agent.name)
      setCompany(agent.company || '')
      setPhone(agent.phone || '')
      setEmail(agent.email || '')
    }
  }

  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

  const addItem = () => setItems(prev => [...prev, { mode: 'custom', planId: '', description: '', amount: 0 }])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))
  const setItemMode = (idx: number, mode: 'plan' | 'custom') => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, mode, planId: '', description: '', amount: 0 } : item))
  }
  const setItemPlan = (idx: number, planId: string) => {
    const tier = planTiers.find(t => t.id === planId)
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item,
      planId,
      description: tier ? `${tier.label} — Agent Plan (${formatPlanDuration(tier.duration_months)})` : '',
      amount: tier?.price ?? 0,
    } : item))
  }
  const updateItem = (idx: number, field: 'description' | 'amount', value: string) => {
    setItems(prev => prev.map((item, i) => i === idx
      ? { ...item, [field]: field === 'amount' ? Number(value) || 0 : value }
      : item
    ))
  }

  // The form's submit just moves to a review screen — nothing is saved (and
  // no bill number is allocated) until Confirm & Create Bill on that screen.
  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowReview(true)
  }

  const confirmCreate = async () => {
    setError(null)
    setSubmitting(true)

    const result = await createBill({
      bill_to_type: billToType,
      agent_id: billToType === 'agent' ? selectedAgentId || null : null,
      bill_to_name: name,
      bill_to_company: company || null,
      bill_to_phone: phone || null,
      bill_to_email: email || null,
      bill_to_address: address || null,
      issue_date: issueDate,
      due_date: dueDate || null,
      notes: notes || null,
      items: items.map(({ description, amount }) => ({ description, amount })),
    })

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setCreatedBillId(result.id!)
    setCreatedBillNumber(result.bill_number!)
    onCreated()
    setSubmitting(false)
  }

  const downloadCreated = async () => {
    if (!createdBillId) return
    const bill = await getBillWithItems(createdBillId)
    if (bill) {
      const doc = await buildBillPdf(bill)
      doc.save(billFileName(bill.bill_number))
    }
  }

  const inputCls = "w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-navy dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
  const labelCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-navy-900 h-14 px-6 border-b border-gray-100/60 dark:border-gray-800/60 flex items-center justify-between z-10">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> {createdBillId ? 'Bill Created' : showReview ? 'Review Bill' : 'New Bill'}
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdBillId ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-navy dark:text-white">{createdBillNumber}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bill created for {name} — {formatINR(total)}</p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={downloadCreated}
                className="h-11 px-5 border border-gray-200/60 dark:border-gray-800/60 rounded-xl font-semibold text-sm text-navy dark:text-white hover:bg-gray-50 dark:hover:bg-navy-800 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={onClose}
                className="h-11 px-5 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl flex items-center gap-2"
              >
                Done
              </button>
            </div>
          </div>
        ) : showReview ? (
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nothing is saved yet and no bill number has been used — check everything below before confirming.
            </p>

            {/* Bill To */}
            <div className="rounded-xl border border-gray-200/60 dark:border-gray-800/60 p-4">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Bill To</p>
              <p className="text-sm font-bold text-navy dark:text-white">{name}</p>
              {company && <p className="text-xs text-gray-500 dark:text-gray-400">{company}</p>}
              {phone && <p className="text-xs text-gray-500 dark:text-gray-400">{phone}</p>}
              {email && <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>}
              {address && <p className="text-xs text-gray-500 dark:text-gray-400">{address}</p>}
            </div>

            {/* Dates */}
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Issue Date</p>
                <p className="text-navy dark:text-white font-medium">{new Date(issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              {dueDate && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due Date</p>
                  <p className="text-navy dark:text-white font-medium">{new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="rounded-xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-navy-800">
                    <th className="text-left font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5 text-xs uppercase tracking-wide">Description</th>
                    <th className="text-right font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5 text-xs uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 text-navy dark:text-white">{item.description || <span className="text-red-500 italic">Missing description</span>}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-navy dark:text-white whitespace-nowrap">{formatINR(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-navy-800 font-bold">
                    <td className="px-4 py-2.5 text-navy dark:text-white">Total</td>
                    <td className="px-4 py-2.5 text-right text-primary whitespace-nowrap">{formatINR(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {notes && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{notes}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReview(false)}
                disabled={submitting}
                className="flex-1 h-11 border border-gray-200/60 dark:border-gray-800/60 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800 disabled:opacity-60"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={confirmCreate}
                disabled={submitting}
                className="flex-1 h-11 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {submitting ? 'Creating...' : 'Confirm & Create Bill'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReview} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
                {error}
              </div>
            )}

            {/* Bill To */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBillToType('agent')}
                  className={`flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${billToType === 'agent' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300'}`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Select Agent
                </button>
                <button
                  type="button"
                  onClick={() => { setBillToType('manual'); setSelectedAgentId('') }}
                  className={`flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${billToType === 'manual' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300'}`}
                >
                  <User className="w-3.5 h-3.5" /> Manual Entry
                </button>
              </div>

              {billToType === 'agent' && (
                <select
                  required
                  value={selectedAgentId}
                  onChange={(e) => selectAgent(e.target.value)}
                  className={inputCls + ' font-medium'}
                >
                  <option value="">— Select an agent —</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}{a.company ? ` — ${a.company}` : ''}</option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className={labelCls}>Name *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Company</label>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company / brokerage" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Address</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Issue Date</label>
                <input required type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Due Date (optional)</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={issueDate} className={inputCls} />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Line Items</label>
                <button type="button" onClick={addItem} className="text-xs font-semibold text-primary hover:text-teal-700 flex items-center gap-1">
                  <PlusIcon className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-gray-200/60 dark:border-gray-800/60 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemMode(idx, 'plan')}
                          className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${item.mode === 'plan' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400'}`}
                        >
                          <CreditCard className="w-3 h-3" /> From Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemMode(idx, 'custom')}
                          className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${item.mode === 'custom' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-gray-400'}`}
                        >
                          <Pencil className="w-3 h-3" /> Custom Charge
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                        className="w-7 h-7 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center disabled:opacity-30 shrink-0"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.mode === 'plan' && (
                      <select
                        required
                        value={item.planId}
                        onChange={e => setItemPlan(idx, e.target.value)}
                        className={inputCls + ' font-medium'}
                      >
                        <option value="">— Select an agent plan —</option>
                        {planTiers.map(t => (
                          <option key={t.id} value={t.id}>{t.label} — {formatPlanPrice(t.price)} ({formatPlanDuration(t.duration_months)})</option>
                        ))}
                      </select>
                    )}

                    <input
                      required
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      placeholder={item.mode === 'plan' ? 'Description (auto-filled — edit if needed)' : 'What this charge is for, e.g. "Commission - Greenwoods Residences" or "Listing Fee"'}
                      className={inputCls}
                    />

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 shrink-0">₹</span>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount || ''}
                        onChange={e => updateItem(idx, 'amount', e.target.value)}
                        placeholder={item.mode === 'plan' ? 'Amount (auto-filled — edit for a prorated/discounted charge)' : 'Amount'}
                        className={inputCls}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <span className="text-sm font-bold text-navy dark:text-white">Total: {formatINR(total)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Payment terms, references, etc." className={inputCls + ' h-auto py-2'} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 h-11 border border-gray-200/60 dark:border-gray-800/60 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800">
                Cancel
              </button>
              <button type="submit" className="flex-1 h-11 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" /> Review Bill
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
