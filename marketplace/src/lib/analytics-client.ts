export type AnalyticsName =
  | "search_performed"
  | "listing_clicked"
  | "listing_saved"
  | "vdp_viewed"
  | "language_switched"

export type LocalEvent = {
  name: AnalyticsName
  at: string
  properties: Record<string, string | number | boolean>
}

export type AnalyticsConsent = "accepted" | "declined" | "unset"

const consentKey = "carbuy.analytics.consent.v1"
const eventsKey = "carbuy.analytics.events.v1"
const allowed = new Set(["listing_id", "position", "source", "result_count", "filter_count", "sort", "from", "to"])

export function analyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "unset"
  try {
    const value = window.localStorage.getItem(consentKey)
    return value === "accepted" || value === "declined" ? value : "unset"
  } catch { return "unset" }
}

export function setAnalyticsConsent(consent: Exclude<AnalyticsConsent, "unset">) {
  try {
    window.localStorage.setItem(consentKey, consent)
    if (consent === "declined") window.localStorage.removeItem(eventsKey)
  } catch { /* Private-browsing storage may be unavailable. */ }
}

export function localAnalyticsEvents(): LocalEvent[] {
  if (typeof window === "undefined") return []
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(eventsKey) || "[]")
    return Array.isArray(parsed) ? parsed.filter((event): event is LocalEvent =>
      !!event && typeof event === "object" && typeof event.name === "string" &&
      typeof event.at === "string" && !!event.properties && typeof event.properties === "object"
    ) : []
  } catch { return [] }
}

export function clearLocalAnalytics() {
  try { window.localStorage.removeItem(eventsKey) } catch { /* No storage. */ }
}

export function trackLocalEvent(name: AnalyticsName, properties: Record<string, unknown> = {}) {
  if (analyticsConsent() !== "accepted") return
  const safe: LocalEvent["properties"] = {}
  for (const [key, value] of Object.entries(properties)) {
    if (!allowed.has(key)) continue
    if (typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) safe[key] = value
    if (typeof value === "string" && value.length <= 80 && /^[\p{L}\p{N}_ .-]+$/u.test(value)) safe[key] = value
  }
  try {
    const events = localAnalyticsEvents()
    events.push({ name, at: new Date().toISOString(), properties: safe })
    window.localStorage.setItem(eventsKey, JSON.stringify(events.slice(-200)))
  } catch { /* Analytics must never interrupt a buyer journey. */ }
}
