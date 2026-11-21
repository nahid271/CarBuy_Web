// Product hypotheses from PRD §21. These are demo values, not a live tariff.
// A real checkout must load approved prices, taxes and eligibility from the server.
export const priceHypothesesBdt = {
  private_listing: 400, // one car, 60 days
  top_7d: 300,
  featured_7d: 700,
  urgent_7d: 150,
  dealer_10: 2500,
  dealer_25: 5500, // retained for existing demo orders
  dealer_50: 10000,
  dealer_200: 30000,
  auction_sheet: 1300,
} as const

export type PricedProduct = keyof typeof priceHypothesesBdt
