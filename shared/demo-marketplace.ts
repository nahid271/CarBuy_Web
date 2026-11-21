/**
 * Browser-only marketplace simulation for the shareable preview.
 * These roles are selectable personas, not authenticated identities.
 * Never use this state or its localStorage persistence for real customer data.
 */
export type DemoRole = "buyer" | "private_seller" | "dealer" | "moderator"
export type DemoStatus = "draft" | "pending" | "live" | "rejected" | "sold"
export type DemoCondition = "Used" | "Reconditioned"
export type DemoAccount = { id: string; role: DemoRole; name: string }
export type DemoListing = {
  id: string; sellerId: string; sellerName: string; sellerType: "private" | "dealer"
  title: string; make: string; model: string; year: number; condition: DemoCondition
  priceBdt: number; mileageKm: number; city: string; area: string; description: string
  photos: string[]; papersDeclared: boolean; status: DemoStatus; sampleCheck: boolean
  createdAt: string; updatedAt: string; moderatorNote?: string; creditUsed?: boolean
}
export type DemoMessage = { id: string; fromId: string; text: string; at: string }
export type DemoConversation = { id: string; listingId: string; buyerId: string; sellerId: string; messages: DemoMessage[] }
export type DemoReport = { id: string; listingId: string; reporterId: string; reason: string; status: "open" | "resolved" | "removed"; at: string }
export type DemoAlert = { id: string; accountId: string; text: string; at: string; read: boolean }
export type DemoSavedSearch = { id: string; buyerId: string; query: string; at: string }
export type DemoState = {
  version: 1; sequence: number; accounts: DemoAccount[]; listings: DemoListing[]
  conversations: DemoConversation[]; reports: DemoReport[]; alerts: DemoAlert[]
  saved: Record<string, string[]>; savedSearches: DemoSavedSearch[]; dealerCredits: Record<string, number>
}
export type NewDemoListing = Pick<DemoListing, "make" | "model" | "year" | "condition" | "priceBdt" | "mileageKm" | "city" | "area" | "description" | "photos" | "papersDeclared">
export type DemoFilters = { query?: string; make?: string; city?: string; condition?: DemoCondition; maxPriceBdt?: number }

export const demoAccounts: DemoAccount[] = [
  { id: "demo-buyer", role: "buyer", name: "Demo buyer" },
  { id: "demo-private", role: "private_seller", name: "Demo private seller" },
  { id: "demo-dealer", role: "dealer", name: "Demo showroom" },
  { id: "demo-moderator", role: "moderator", name: "Demo moderator" },
]

export type SeedCar = {
  id: string; make: string; model: string; trim: string; year: number; condition: DemoCondition
  priceBdt: number; mileageKm: number; city: string; area: string
  seller: { name: string; kind: "Owner" | "Showroom" }; photo: { src: string }; verified: boolean
}

const next = (state: DemoState, prefix: string) => `${prefix}-${state.sequence++}`
function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message) }
const clone = (state: DemoState): DemoState => structuredClone(state)
const actor = (state: DemoState, id: string) => {
  const account = state.accounts.find(item => item.id === id)
  if (!account) throw new Error("Demo persona not found")
  return account
}
const listing = (state: DemoState, id: string) => {
  const item = state.listings.find(row => row.id === id)
  if (!item) throw new Error("Listing not found")
  return item
}
const alert = (state: DemoState, accountId: string, text: string, at: string) =>
  state.alerts.unshift({ id: next(state, "alert"), accountId, text, at, read: false })

export function initialDemoState(seedCars: SeedCar[], now = new Date()): DemoState {
  const at = now.toISOString()
  return {
    version: 1, sequence: 1, accounts: structuredClone(demoAccounts),
    listings: seedCars.map(car => ({
      id: car.id, sellerId: car.seller.kind === "Owner" ? "demo-private" : "demo-dealer",
      sellerName: car.seller.name, sellerType: car.seller.kind === "Owner" ? "private" : "dealer",
      title: `${car.year} ${car.make} ${car.model} ${car.trim}`.trim(), make: car.make, model: car.model,
      year: car.year, condition: car.condition, priceBdt: car.priceBdt, mileageKm: car.mileageKm,
      city: car.city, area: car.area, description: "Sample vehicle for the interactive CarBuy preview. Inspect a real car and its original documents before paying anyone.",
      photos: [car.photo.src], papersDeclared: false, status: "live", sampleCheck: car.verified,
      createdAt: at, updatedAt: at,
    })),
    conversations: [], reports: [], alerts: [], saved: {}, savedSearches: [], dealerCredits: { "demo-dealer": 10 },
  }
}

export function restoreDemoState(raw: unknown, seedCars: SeedCar[]): DemoState {
  if (!raw || typeof raw !== "object") return initialDemoState(seedCars)
  const data = raw as Partial<DemoState>
  if (data.version !== 1 || !Number.isInteger(data.sequence) || !Array.isArray(data.accounts) ||
    !Array.isArray(data.listings) || !Array.isArray(data.conversations) || !Array.isArray(data.reports) ||
    !Array.isArray(data.alerts) || !Array.isArray(data.savedSearches) || !data.saved || !data.dealerCredits) return initialDemoState(seedCars)
  return clone(data as DemoState)
}

export function searchDemoListings(state: DemoState, filters: DemoFilters = {}): DemoListing[] {
  const query = filters.query?.trim().toLowerCase() || ""
  return state.listings.filter(item => item.status === "live" &&
    (!query || [item.title, item.city, item.area].join(" ").toLowerCase().includes(query)) &&
    (!filters.make || item.make.toLowerCase() === filters.make.toLowerCase()) &&
    (!filters.city || item.city.toLowerCase() === filters.city.toLowerCase()) &&
    (!filters.condition || item.condition === filters.condition) &&
    (!filters.maxPriceBdt || item.priceBdt <= filters.maxPriceBdt)
  ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function validateNewListing(input: NewDemoListing, now: Date) {
  ensure(input.make.trim().length >= 2 && input.make.length <= 40, "Choose a valid make")
  ensure(input.model.trim().length >= 1 && input.model.length <= 50, "Choose a valid model")
  ensure(Number.isInteger(input.year) && input.year >= 1980 && input.year <= now.getFullYear() + 1, "Invalid model year")
  ensure(input.condition === "Used" || input.condition === "Reconditioned", "Invalid condition")
  ensure(Number.isInteger(input.priceBdt) && input.priceBdt >= 100_000 && input.priceBdt <= 100_000_000, "Invalid asking price")
  ensure(Number.isInteger(input.mileageKm) && input.mileageKm >= 0 && input.mileageKm <= 1_000_000, "Invalid mileage")
  ensure(input.city.trim().length >= 2 && input.city.length <= 60 && input.area.length <= 60, "Invalid location")
  ensure(input.description.trim().length >= 30 && input.description.length <= 2_000, "Add a useful description of at least 30 characters")
  ensure(!/(?:https?:\/\/|www\.|\+?880\s*1\d{9}|01\d{9})/i.test(input.description), "Keep phone numbers and links out of the description")
  ensure(Array.isArray(input.photos) && input.photos.length <= 3 && input.photos.every(photo => /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(photo) && photo.length <= 650_000), "Use up to three small JPG, PNG or WebP photos")
}

export function createDemoDraft(state: DemoState, accountId: string, input: NewDemoListing, now = new Date()): DemoState {
  const account = actor(state, accountId)
  ensure(account.role === "private_seller" || account.role === "dealer", "Switch to a seller or dealer persona")
  validateNewListing(input, now)
  ensure(state.listings.filter(item => item.sellerId === accountId && item.status !== "sold").length < 50, "Demo listing limit reached")
  const copy = clone(state), at = now.toISOString()
  copy.listings.unshift({ ...input, id: next(copy, "listing"), sellerId: accountId, sellerName: account.name,
    sellerType: account.role === "dealer" ? "dealer" : "private", title: `${input.year} ${input.make.trim()} ${input.model.trim()}`,
    make: input.make.trim(), model: input.model.trim(), city: input.city.trim(), area: input.area.trim(),
    description: input.description.trim(), status: "draft", sampleCheck: false, createdAt: at, updatedAt: at })
  return copy
}

export function submitDemoListing(state: DemoState, accountId: string, listingId: string, now = new Date()): DemoState {
  actor(state, accountId)
  const copy = clone(state), item = listing(copy, listingId)
  ensure(item.sellerId === accountId && (item.status === "draft" || item.status === "rejected"), "Only your draft can be submitted")
  ensure(item.photos.length > 0, "Add at least one photo before submitting")
  if (item.sellerType === "dealer") {
    ensure((copy.dealerCredits[accountId] || 0) > 0, "No demo dealer credits remain")
    copy.dealerCredits[accountId] -= 1
    item.creditUsed = true
  }
  item.status = "pending"; item.moderatorNote = undefined; item.updatedAt = now.toISOString()
  alert(copy, "demo-moderator", `${item.title} is awaiting review`, item.updatedAt)
  return copy
}

export function moderateDemoListing(state: DemoState, moderatorId: string, listingId: string, approve: boolean, reason = "", now = new Date()): DemoState {
  ensure(actor(state, moderatorId).role === "moderator", "Moderator persona required")
  const copy = clone(state), item = listing(copy, listingId)
  ensure(item.status === "pending", "Only pending listings can be reviewed")
  if (!approve) ensure(reason.trim().length >= 5, "Give a clear rejection reason")
  item.status = approve ? "live" : "rejected"; item.moderatorNote = approve ? undefined : reason.trim(); item.updatedAt = now.toISOString()
  if (!approve && item.creditUsed) { copy.dealerCredits[item.sellerId] = (copy.dealerCredits[item.sellerId] || 0) + 1; item.creditUsed = false }
  alert(copy, item.sellerId, approve ? `${item.title} is live in the demo` : `${item.title} needs changes: ${reason.trim()}`, item.updatedAt)
  if (approve) for (const saved of copy.savedSearches) if (item.title.toLowerCase().includes(saved.query.toLowerCase()))
    alert(copy, saved.buyerId, `New sample car matches “${saved.query}”: ${item.title}`, item.updatedAt)
  return copy
}

export function changeDemoPrice(state: DemoState, accountId: string, listingId: string, priceBdt: number, now = new Date()): DemoState {
  actor(state, accountId)
  const copy = clone(state), item = listing(copy, listingId)
  ensure(item.sellerId === accountId && item.status === "live", "Only your live listing can change price")
  ensure(Number.isInteger(priceBdt) && priceBdt >= 100_000 && priceBdt <= 100_000_000, "Invalid asking price")
  const oldPrice = item.priceBdt
  item.priceBdt = priceBdt; item.updatedAt = now.toISOString()
  if (priceBdt < oldPrice) for (const [buyerId, saved] of Object.entries(copy.saved)) if (saved.includes(item.id))
    alert(copy, buyerId, `${item.title} price dropped in the demo`, item.updatedAt)
  return copy
}

export function markDemoSold(state: DemoState, accountId: string, listingId: string, now = new Date()): DemoState {
  actor(state, accountId)
  const copy = clone(state), item = listing(copy, listingId)
  ensure(item.sellerId === accountId && item.status === "live", "Only your live listing can be marked sold")
  item.status = "sold"; item.updatedAt = now.toISOString()
  for (const [buyerId, saved] of Object.entries(copy.saved)) if (saved.includes(item.id))
    alert(copy, buyerId, `${item.title} was marked sold in the demo`, item.updatedAt)
  return copy
}

export function toggleDemoSave(state: DemoState, buyerId: string, listingId: string): DemoState {
  ensure(actor(state, buyerId).role === "buyer", "Buyer persona required")
  ensure(listing(state, listingId).status === "live", "Only live cars can be saved")
  const copy = clone(state), saved = copy.saved[buyerId] || []
  copy.saved[buyerId] = saved.includes(listingId) ? saved.filter(id => id !== listingId) : [...saved, listingId]
  return copy
}

export function saveDemoSearch(state: DemoState, buyerId: string, query: string, now = new Date()): DemoState {
  ensure(actor(state, buyerId).role === "buyer", "Buyer persona required")
  const term = query.trim().slice(0, 80)
  ensure(term.length >= 2, "Enter at least two search characters")
  const copy = clone(state)
  if (!copy.savedSearches.some(item => item.buyerId === buyerId && item.query.toLowerCase() === term.toLowerCase()))
    copy.savedSearches.unshift({ id: next(copy, "search"), buyerId, query: term, at: now.toISOString() })
  return copy
}

export function startDemoChat(state: DemoState, buyerId: string, listingId: string, now = new Date()): DemoState {
  ensure(actor(state, buyerId).role === "buyer", "Buyer persona required")
  const item = listing(state, listingId)
  ensure(item.status === "live", "Contact is available for live cars only")
  if (state.conversations.some(row => row.buyerId === buyerId && row.listingId === listingId)) return state
  const copy = clone(state), id = next(copy, "chat")
  copy.conversations.unshift({ id, listingId, buyerId, sellerId: item.sellerId, messages: [] })
  alert(copy, item.sellerId, `New demo lead for ${item.title}`, now.toISOString())
  return copy
}

export function sendDemoMessage(state: DemoState, accountId: string, conversationId: string, text: string, now = new Date()): DemoState {
  actor(state, accountId)
  const copy = clone(state), thread = copy.conversations.find(row => row.id === conversationId)
  ensure(thread, "Conversation not found")
  ensure(thread.buyerId === accountId || thread.sellerId === accountId, "This persona cannot join that conversation")
  const message = text.trim()
  ensure(message.length >= 1 && message.length <= 500, "Message must be 1–500 characters")
  ensure(!/(?:https?:\/\/|www\.|\+?880\s*1\d{9}|01\d{9})/i.test(message), "Keep phone numbers and links out of demo chat")
  ensure(thread.messages.length < 100, "Demo conversation limit reached")
  const at = now.toISOString()
  thread.messages.push({ id: next(copy, "message"), fromId: accountId, text: message, at })
  alert(copy, thread.buyerId === accountId ? thread.sellerId : thread.buyerId, "New demo chat message", at)
  return copy
}

export function reportDemoListing(state: DemoState, buyerId: string, listingId: string, reason: string, now = new Date()): DemoState {
  ensure(actor(state, buyerId).role === "buyer", "Buyer persona required")
  ensure(listing(state, listingId).status === "live", "Only live cars can be reported")
  const clean = reason.trim()
  ensure(clean.length >= 10 && clean.length <= 500, "Explain the concern in 10–500 characters")
  ensure(!state.reports.some(row => row.listingId === listingId && row.reporterId === buyerId && row.status === "open"), "You already reported this car")
  const copy = clone(state), at = now.toISOString()
  copy.reports.unshift({ id: next(copy, "report"), listingId, reporterId: buyerId, reason: clean, status: "open", at })
  alert(copy, "demo-moderator", `New demo report about ${listing(copy, listingId).title}`, at)
  return copy
}

export function resolveDemoReport(state: DemoState, moderatorId: string, reportId: string, removeListing: boolean, now = new Date()): DemoState {
  ensure(actor(state, moderatorId).role === "moderator", "Moderator persona required")
  const copy = clone(state), report = copy.reports.find(item => item.id === reportId)
  ensure(report?.status === "open", "Open report required")
  report.status = removeListing ? "removed" : "resolved"
  if (removeListing) {
    const item = listing(copy, report.listingId)
    item.status = "rejected"; item.moderatorNote = "Removed after a demo report"; item.updatedAt = now.toISOString()
    alert(copy, item.sellerId, `${item.title} was removed after a demo report`, item.updatedAt)
  }
  alert(copy, report.reporterId, "Your demo report was reviewed", now.toISOString())
  return copy
}

export function readDemoAlert(state: DemoState, accountId: string, alertId: string): DemoState {
  actor(state, accountId)
  const copy = clone(state), row = copy.alerts.find(item => item.id === alertId && item.accountId === accountId)
  ensure(row, "Alert not found")
  row.read = true
  return copy
}
