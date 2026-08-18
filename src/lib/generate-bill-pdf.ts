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
  status?: string
  total: number
  items: BillPdfItem[]
  verification_code?: string
}

function formatINR(n: number) {
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10), o = n % 10
  return TENS[t] + (o ? ' ' + ONES[o] : '')
}

function threeDigitWords(n: number): string {
  const h = Math.floor(n / 100), rest = n % 100
  const parts: string[] = []
  if (h) parts.push(ONES[h] + ' Hundred')
  if (rest) parts.push(twoDigitWords(rest))
  return parts.join(' ')
}

// Indian numbering (crore/lakh/thousand), not the Western thousand/million
// grouping — the correct convention for a Roofmint invoice.
function numberToWordsIndian(num: number): string {
  num = Math.round(num)
  if (num === 0) return 'Zero'
  const crore = Math.floor(num / 1e7); num %= 1e7
  const lakh = Math.floor(num / 1e5); num %= 1e5
  const thousand = Math.floor(num / 1e3); num %= 1e3
  const rest = num
  const parts: string[] = []
  if (crore) parts.push(twoDigitWords(crore) + ' Crore')
  if (lakh) parts.push(twoDigitWords(lakh) + ' Lakh')
  if (thousand) parts.push(twoDigitWords(thousand) + ' Thousand')
  if (rest) parts.push(threeDigitWords(rest))
  return parts.join(' ')
}

function amountInWordsINR(n: number): string {
  return `Rupees ${numberToWordsIndian(n)} Only`
}

const STATUS_COLORS: Record<string, [number, number, number]> = {
  PAID: [22, 163, 74],
  UNPAID: [217, 119, 6],
  CANCELLED: [107, 114, 128],
}

// Builds the invoice PDF and returns the jsPDF document — caller decides
// whether to .save() it (download) or pull out doc.output('blob') (share).
export async function buildBillPdf(bill: BillPdfData) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const brandTeal: [number, number, number] = [13, 148, 136]
  const navy: [number, number, number] = [15, 23, 42]
  const gray: [number, number, number] = [110, 118, 128]
  const border: [number, number, number] = [226, 232, 240]

  // Outer letterhead frame.
  doc.setDrawColor(...border)
  doc.setLineWidth(1)
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40)

  // Header — wordmark left, "INVOICE" + bill number + date + status right.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...navy)
  doc.text('roof', margin, 55)
  const roofWidth = doc.getTextWidth('roof')
  doc.setTextColor(...brandTeal)
  doc.text('mint', margin + roofWidth, 55)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('AI finds. You decide. Perfect Home.', margin, 70)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...navy)
  doc.text('INVOICE', pageWidth - margin, 50, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...gray)
  doc.text(`Bill No: ${bill.bill_number}`, pageWidth - margin, 67, { align: 'right' })
  doc.text(`Date: ${formatDate(bill.issue_date)}`, pageWidth - margin, 80, { align: 'right' })
  if (bill.due_date) {
    doc.text(`Due: ${formatDate(bill.due_date)}`, pageWidth - margin, 93, { align: 'right' })
  }

  // Status badge, right-aligned beneath the metadata block.
  const statusLabel = (bill.status || 'unpaid').toUpperCase()
  const statusColor = STATUS_COLORS[statusLabel] || STATUS_COLORS.UNPAID
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const badgeTextW = doc.getTextWidth(statusLabel)
  const badgeW = badgeTextW + 18
  const badgeH = 17
  const badgeX = pageWidth - margin - badgeW
  const badgeY = 102
  doc.setFillColor(...statusColor)
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(statusLabel, badgeX + badgeW / 2, badgeY + badgeH / 2 + 3.2, { align: 'center' })

  doc.setDrawColor(...border)
  doc.setLineWidth(0.75)
  doc.line(margin, 134, pageWidth - margin, 134)

  // From / Bill To columns
  const colY = 158
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('FROM', margin, colY)
  doc.text('BILL TO', pageWidth / 2, colY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...navy)
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
  const itemsTableStartY = colY + 16 + Math.max(fromLines.length, toLines.length) * 14 + 22
  autoTable(doc, {
    startY: itemsTableStartY,
    head: [['#', 'Description', 'Amount']],
    body: bill.items.map((item, i) => [String(i + 1), item.description, formatINR(item.amount)]),
    theme: 'grid',
    headStyles: { fillColor: brandTeal, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 110, halign: 'right' },
    },
    styles: { fontSize: 10, cellPadding: 8, lineColor: border, lineWidth: 0.5 },
    margin: { left: margin, right: margin },
  })

  const afterTableY = (doc as any).lastAutoTable.finalY + 22

  // Total, boxed for emphasis.
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(...border)
  doc.roundedRect(pageWidth - margin - 200, afterTableY - 14, 200, 26, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...navy)
  doc.text('Total', pageWidth - margin - 190, afterTableY + 4)
  doc.setTextColor(...brandTeal)
  doc.text(formatINR(bill.total), pageWidth - margin - 10, afterTableY + 4, { align: 'right' })

  let cursorY = afterTableY + 32
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  const wordsLine = doc.splitTextToSize(`In words: ${amountInWordsINR(bill.total)}`, pageWidth - margin * 2)
  doc.text(wordsLine, margin, cursorY)
  cursorY += wordsLine.length * 12 + 14

  if (bill.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...gray)
    doc.text('NOTES', margin, cursorY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...navy)
    const wrapped = doc.splitTextToSize(bill.notes, pageWidth - margin * 2)
    doc.text(wrapped, margin, cursorY + 16)
    cursorY += 16 + wrapped.length * 13
  }

  doc.setDrawColor(...border)
  doc.setLineWidth(0.75)
  doc.line(margin, pageHeight - 60, pageWidth - margin, pageHeight - 60)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('Thank you for partnering with Roofmint.', margin, pageHeight - 42)
  doc.text('This is a system-generated bill and does not require a signature.', margin, pageHeight - 28)

  if (bill.verification_code) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...gray)
    doc.text(`Ref: ${bill.verification_code}`, pageWidth - margin, pageHeight - 28, { align: 'right' })
  }

  return doc
}

export function billFileName(billNumber: string) {
  return `${billNumber}.pdf`
}
