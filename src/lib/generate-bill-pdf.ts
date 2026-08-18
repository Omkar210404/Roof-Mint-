export interface BillPdfItem {
  description: string
  amount: number
}

export interface BillPdfData {
  bill_number: string
  bill_to_name: string
  bill_to_company?: string | null
  bill_to_phone?: string | null
  bill_to_email?: string | null
  bill_to_address?: string | null
  issue_date: string
  due_date?: string | null
  notes?: string | null
  total: number
  items: BillPdfItem[]
}

function formatINR(n: number) {
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Builds the invoice PDF and returns the jsPDF document — caller decides
// whether to .save() it (download) or pull out doc.output('blob') (share).
export async function buildBillPdf(bill: BillPdfData) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const brandTeal: [number, number, number] = [13, 148, 136]
  const gray: [number, number, number] = [110, 118, 128]

  // Header — company name left, "INVOICE" + bill number + date right.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42)
  doc.text('roof', margin, 50)
  const roofWidth = doc.getTextWidth('roof')
  doc.setTextColor(...brandTeal)
  doc.text('mint', margin + roofWidth, 50)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('AI finds. You decide. Perfect Home.', margin, 65)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text('INVOICE', pageWidth - margin, 45, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...gray)
  doc.text(`Bill No: ${bill.bill_number}`, pageWidth - margin, 62, { align: 'right' })
  doc.text(`Date: ${formatDate(bill.issue_date)}`, pageWidth - margin, 75, { align: 'right' })
  if (bill.due_date) {
    doc.text(`Due: ${formatDate(bill.due_date)}`, pageWidth - margin, 88, { align: 'right' })
  }

  doc.setDrawColor(226, 232, 240)
  doc.line(margin, 100, pageWidth - margin, 100)

  // From / Bill To columns
  const colY = 125
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('FROM', margin, colY)
  doc.text('BILL TO', pageWidth / 2, colY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  const fromLines = ['Roofmint', 'Yashwant Shrushti, Boisar,', 'Maharashtra - 401501, India', 'support@roofmint.in']
  fromLines.forEach((line, i) => doc.text(line, margin, colY + 16 + i * 14))

  const toLines = [
    bill.bill_to_name,
    bill.bill_to_company || '',
    bill.bill_to_phone || '',
    bill.bill_to_email || '',
    ...(bill.bill_to_address ? [bill.bill_to_address] : []),
  ].filter(Boolean)
  toLines.forEach((line, i) => doc.text(line, pageWidth / 2, colY + 16 + i * 14))

  // Items table
  const itemsTableStartY = colY + 16 + Math.max(fromLines.length, toLines.length) * 14 + 20
  autoTable(doc, {
    startY: itemsTableStartY,
    head: [['#', 'Description', 'Amount']],
    body: bill.items.map((item, i) => [String(i + 1), item.description, formatINR(item.amount)]),
    theme: 'grid',
    headStyles: { fillColor: brandTeal, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 110, halign: 'right' },
    },
    styles: { fontSize: 10, cellPadding: 8 },
    margin: { left: margin, right: margin },
  })

  const afterTableY = (doc as any).lastAutoTable.finalY + 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('Total', pageWidth - margin - 120, afterTableY, { align: 'left' })
  doc.setTextColor(...brandTeal)
  doc.text(formatINR(bill.total), pageWidth - margin, afterTableY, { align: 'right' })

  let cursorY = afterTableY + 30
  if (bill.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...gray)
    doc.text('NOTES', margin, cursorY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    const wrapped = doc.splitTextToSize(bill.notes, pageWidth - margin * 2)
    doc.text(wrapped, margin, cursorY + 16)
    cursorY += 16 + wrapped.length * 13
  }

  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, pageHeight - 60, pageWidth - margin, pageHeight - 60)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('Thank you for partnering with Roofmint.', margin, pageHeight - 42)
  doc.text('This is a system-generated bill and does not require a signature.', margin, pageHeight - 28)

  return doc
}

export function billFileName(billNumber: string) {
  return `${billNumber}.pdf`
}
