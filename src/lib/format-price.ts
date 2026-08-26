// Indian real estate pricing convention — Lakhs below 1 Cr, Crores above.
// Trims to 2 decimal places only when the value isn't a round number, so a
// listing at exactly ₹50L still reads "₹50 L" rather than "₹50.00 L", but
// one at ₹42,48,000 reads "₹42.48 L" instead of silently rounding to "₹42 L"
// and dropping ₹48,000 of the actual price.
function formatUnit(value: number, unit: string): string {
  const rounded = Math.round(value * 100) / 100
  const display = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2)
  return `₹${display} ${unit}`
}

export function formatPrice(price: number): string {
  if (!price) return '₹0'
  if (price >= 10000000) return formatUnit(price / 10000000, 'Cr')
  if (price >= 100000) return formatUnit(price / 100000, 'L')
  return `₹${price.toLocaleString('en-IN')}`
}

// price_type is independent of the tax status — a price can be Negotiable
// *and* all-inclusive at once, so this combines whichever apply instead of
// competing for a single label slot. price_all_inclusive and
// price_taxes_extra are themselves mutually exclusive (the admin form uses
// radio buttons for these two), so at most one of them ever contributes.
export function derivePriceLabel(property: { price_type?: string | null; price_all_inclusive?: boolean | null; price_taxes_extra?: boolean | null }): string {
  const parts: string[] = []
  if (property.price_type === 'starting_from') parts.push('Onwards')
  else if (property.price_type === 'negotiable') parts.push('Negotiable')
  if (property.price_all_inclusive) parts.push('All Inclusive')
  else if (property.price_taxes_extra) parts.push('+ Taxes Extra')
  return parts.join(' · ')
}
