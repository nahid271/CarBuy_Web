// en-IN gives the lakh/crore digit grouping used in Bangladesh (26,50,000).
const grouped = new Intl.NumberFormat("en-IN")
const oneDecimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 })

/** 2_650_000 → "26.5 lakh", 12_500_000 → "1.25 crore" */
export function formatLakh(taka: number): string {
  if (taka >= 10_000_000) {
    return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(taka / 10_000_000)} crore`
  }
  return `${oneDecimal.format(taka / 100_000)} lakh`
}

/** 2_650_000 → "৳26,50,000" */
export function formatTaka(taka: number): string {
  return `৳${grouped.format(Math.round(taka))}`
}

/** 162_000 → "1,62,000 km" */
export function formatKm(km: number): string {
  return `${grouped.format(km)} km`
}

export function formatCount(n: number): string {
  return grouped.format(n)
}

/**
 * Indicative monthly instalment: 20% down, the rest over `months` at `annualRate`.
 * Used for the "EMI from" hint on cards; real quotes come from partner banks.
 */
export function estimateEmi(taka: number, annualRate = 0.1, months = 60): number {
  const principal = taka * 0.8
  const r = annualRate / 12
  const factor = (1 + r) ** months
  return (principal * r * factor) / (factor - 1)
}
