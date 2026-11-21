// Planning data transcribed from PRD §§18, 22–24. None of these entries certifies launch readiness.
export const budgetLines = [
  { id: "marketing", label: "Marketing", baselineBdt: 720_000 },
  { id: "infrastructure", label: "Infrastructure and tools", baselineBdt: 140_000 },
  { id: "legal", label: "Business setup and legal", baselineBdt: 100_000 },
  { id: "auction", label: "Auction-sheet float", baselineBdt: 40_000 },
  { id: "distribution", label: "Play, domain and SMS", baselineBdt: 40_000 },
  { id: "contingency", label: "Contingency", baselineBdt: 170_000 },
] as const

export const milestones = [
  { id: "foundations", target: "Week 6", title: "Foundations, vehicle list and chassis codes" },
  { id: "closed_beta", target: "Week 23", title: "Closed beta with founding dealers" },
  { id: "public_mvp", target: "Week 25", title: "Public web and Android MVP" },
  { id: "full_launch", target: "Around month 14", title: "Full launch" },
] as const

export const discoveryTargets = [
  { id: "showrooms", label: "Showrooms visited", target: 20 },
  { id: "private_sellers", label: "Private sellers interviewed", target: 20 },
  { id: "buyers", label: "Buyers interviewed", target: 20 },
  { id: "founding_dealers", label: "Founding dealers onboarded", target: 50 },
] as const

export const monthlyCostLines = [
  { id: "backend", label: "Backend and database" },
  { id: "hosting", label: "Web hosting and CDN" },
  { id: "images", label: "Photo storage and delivery" },
  { id: "sms", label: "SMS and sender identity" },
  { id: "email", label: "Email and push delivery" },
  { id: "ai", label: "AI and moderation tools" },
  { id: "mobile", label: "Android build and release" },
] as const

export const releaseGates = [
  { id: "identity", label: "Real identity, roles and admin 2FA", section: 17 },
  { id: "data", label: "Hosted database and private document storage", section: 17 },
  { id: "commerce", label: "Merchant account, taxes, verified payment and refunds", section: 21 },
  { id: "compliance", label: "Bangladesh counsel review and approved policies", section: 19 },
  { id: "trust", label: "Staffed moderation and document-check process", section: 23 },
  { id: "android", label: "Android app or approved fallback and Play review", section: 17 },
  { id: "beta", label: "Founding dealer beta with measured outcomes", section: 20 },
] as const

export const risks = [
  { id: "R1", title: "Entrenched competitors", mitigation: "Differentiate through trustworthy checks, founding dealers and Bangla search." },
  { id: "R2", title: "Solo operating load", mitigation: "Share code, use managed services, start with manual workflows and keep an Android fallback." },
  { id: "R3", title: "Small marketing budget", mitigation: "Test SEO, creator partnerships, referrals and shareable listings before scaling paid ads." },
  { id: "R4", title: "Fraud and fake papers", mitigation: "Review listings, verify documents with a real process, screen scam patterns and provide reporting." },
  { id: "R5", title: "Play purchase policy", mitigation: "Confirm policy for every digital product before enabling Android purchases." },
  { id: "R6", title: "Changing regulation", mitigation: "Get local counsel review and keep hosting/data choices configurable." },
  { id: "R7", title: "Auction-sheet partner quality", mitigation: "Test multiple providers and refund when a requested sheet cannot be found." },
  { id: "R8", title: "Import policy changes", mitigation: "Keep used-car supply strong and review current policy before import-dependent claims." },
  { id: "R9", title: "Gateway onboarding delay", mitigation: "Start onboarding early and defer charges until a verified gateway is ready." },
  { id: "R10", title: "Paid listings reduce supply", mitigation: "Use founding-dealer credits and test private listing prices with real sellers." },
] as const

export const openQuestions = [
  { id: "O1", question: "Which auction-sheet partner has acceptable accuracy, speed and terms?" },
  { id: "O2", question: "Which Bangladesh payment gateway can onboard CarBuy?" },
  { id: "O3", question: "Which entity, registrations and digital-commerce obligations apply?" },
  { id: "O4", question: "Which hosting region is permitted by current data rules?" },
  { id: "O5", question: "What purchase flow does Google Play permit for each paid product?" },
  { id: "O6", question: "Which listing, boost, credit and sheet prices do sellers accept?" },
  { id: "O7", question: "How many free founding-dealer credits, and for how long?" },
  { id: "O8", question: "What registration-number masking rule will every public surface enforce?" },
  { id: "O9", question: "Is the CarBuy domain and trademark available?" },
  { id: "O10", question: "Which language should new visitors see by default?" },
] as const

export type BudgetLineId = typeof budgetLines[number]["id"]
export type MilestoneId = typeof milestones[number]["id"]
export type QuestionId = typeof openQuestions[number]["id"]
export type DiscoveryId = typeof discoveryTargets[number]["id"]
export type MonthlyCostId = typeof monthlyCostLines[number]["id"]

export function budgetTotal(values: Partial<Record<BudgetLineId, number>> = {}) {
  return budgetLines.reduce((sum, line) => {
    const value = values[line.id] ?? line.baselineBdt
    if (!Number.isFinite(value) || value < 0 || value > 100_000_000) throw new Error("Invalid planning amount")
    return sum + value
  }, 0)
}
