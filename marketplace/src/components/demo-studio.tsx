"use client"
/* eslint-disable @next/next/no-img-element -- Demo photos are validated browser-local files or curated sample URLs. */

import { useEffect, useState } from "react"
import Link from "next/link"
import { featuredListings, makes, cities } from "@/lib/mock-listings"
import { trackLocalEvent } from "@/lib/analytics-client"
import {
  initialDemoState, restoreDemoState, searchDemoListings,
  submitDemoListing, moderateDemoListing, changeDemoPrice, markDemoSold, toggleDemoSave,
  saveDemoSearch, startDemoChat, sendDemoMessage, reportDemoListing, resolveDemoReport, readDemoAlert,
  type DemoState, type DemoListing, type DemoConversation, type DemoSoldVia,
} from "@/lib/demo"

const key = "carbuy.interactive-demo.v1"
const seed = initialDemoState(featuredListings, new Date("2026-01-01T00:00:00.000Z"))
const tabs = ["Buy", "Saved", "Sell", "Dealer", "Inbox", "Alerts", "Moderate"] as const
type Tab = typeof tabs[number]
const money = (value: number) => `৳${value.toLocaleString("en-BD")}`

function saveBrowser(next: DemoState) {
  try { localStorage.setItem(key, JSON.stringify(next)); return true } catch { return false }
}

export function DemoStudio() {
  const [state, setState] = useState<DemoState>(seed)
  const [accountId, setAccountId] = useState("demo-buyer")
  const [tab, setTab] = useState<Tab>("Buy")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [query, setQuery] = useState("")
  const [make, setMake] = useState("")
  const [city, setCity] = useState("")
  const [maxLakh, setMaxLakh] = useState("")
  const [message, setMessage] = useState("")
  const [reportReason, setReportReason] = useState("")
  const [reviewReason, setReviewReason] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const raw = localStorage.getItem(key); if (raw) setState(restoreDemoState(JSON.parse(raw), featuredListings)) } catch { /* Fresh demo. */ }
      const params = new URLSearchParams(window.location.search)
      const requested = params.get("tab")
      const matched = tabs.find(item => item.toLowerCase() === requested?.toLowerCase())
      if (matched) setTab(matched)
      const requestedPersona = params.get("persona")
      if (requestedPersona && seed.accounts.some(persona => persona.id === requestedPersona)) setAccountId(requestedPersona)
      if (params.get("listing")) setSelectedId(params.get("listing"))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const account = state.accounts.find(item => item.id === accountId) || state.accounts[0]
  const selected = selectedId ? state.listings.find(item => item.id === selectedId) : undefined
  const liveCars = searchDemoListings(state, {
    query, make, city, maxPriceBdt: maxLakh ? Number(maxLakh) * 100_000 : undefined,
  })
  const ownCars = state.listings.filter(item => item.sellerId === accountId)
  const threads = state.conversations.filter(item => item.buyerId === accountId || item.sellerId === accountId)
  const activeThread = threads.find(item => item.id === activeThreadId) || threads[0]
  const alerts = state.alerts.filter(item => item.accountId === accountId)
  const unread = alerts.filter(item => !item.read).length

  const commit = (operation: () => DemoState, success: string): DemoState | null => {
    try {
      const next = operation()
      const stored = saveBrowser(next)
      setState(next)
      setNotice(stored ? success : `${success} Browser storage is unavailable or full; changes may disappear on refresh.`)
      return next
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The demo action failed")
      return null
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next); setSelectedId(null); setNotice("")
    const url = new URL(window.location.href)
    url.searchParams.set("tab", next.toLowerCase())
    url.searchParams.delete("listing")
    window.history.replaceState(null, "", url)
  }
  const openCar = (id: string) => {
    setSelectedId(id)
    const url = new URL(window.location.href)
    url.searchParams.set("listing", id)
    window.history.replaceState(null, "", url)
    trackLocalEvent("vdp_viewed", { listing_id: id })
  }
  const choosePersona = (id: string) => {
    const next = state.accounts.find(item => item.id === id)
    if (!next) return
    setAccountId(id); setSelectedId(null); setNotice("")
    const url = new URL(window.location.href)
    url.searchParams.set("persona", id)
    window.history.replaceState(null, "", url)
    switchTab(next.role === "buyer" ? "Buy" : next.role === "moderator" ? "Moderate" : next.role === "dealer" ? "Dealer" : "Sell")
  }

  const contactSeller = (item: DemoListing) => {
    const next = commit(() => startDemoChat(state, accountId, item.id), "Conversation opened in the demo inbox.")
    if (!next) return
    const thread = next.conversations.find(row => row.listingId === item.id && row.buyerId === accountId)
    setActiveThreadId(thread?.id || null)
    setSelectedId(null)
    switchTab("Inbox")
    trackLocalEvent("chat_started", { listing_id: item.id, seller_type: item.sellerType })
  }

  const submitMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeThread) return
    const next = commit(() => sendDemoMessage(state, accountId, activeThread.id, message), "Message saved in this browser.")
    if (next) { setMessage(""); if (account.role !== "buyer") trackLocalEvent("seller_replied", { listing_id: activeThread.listingId }) }
  }

  const reset = () => {
    if (!window.confirm("Reset this browser's CarBuy demo listings, chats, saves and alerts?")) return
    try { localStorage.removeItem(key) } catch { /* In-memory reset still works. */ }
    setState(seed); setAccountId("demo-buyer"); setTab("Buy"); setSelectedId(null); setNotice("Demo reset to sample data.")
  }

  return <main className="flex-1"><div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
    <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CarBuy · interactive marketplace demo</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Try the whole journey.</h1><p className="mt-4 max-w-3xl text-muted-foreground">Browse, save, list, review and message across selectable demo personas. Everything stays in this browser. Persona switching is a simulation, not secure sign-in.</p></div><button type="button" onClick={reset} className="rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Reset demo</button></div>
    <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4"><label className="text-sm font-medium" htmlFor="demo-persona">Demo persona</label><select id="demo-persona" value={accountId} onChange={event => choosePersona(event.target.value)} className="min-w-52 rounded-lg border bg-background px-3 py-2 text-sm">{state.accounts.map(persona => <option key={persona.id} value={persona.id}>{persona.name} · {persona.role.replace("_", " ")}</option>)}</select><span className="text-xs text-muted-foreground">No real account, identity check, payment or seller contact is created.</span></div>
    <nav aria-label="Demo areas" className="mt-7 flex flex-wrap gap-2 border-b pb-4">{tabs.map(item => <button key={item} type="button" onClick={() => switchTab(item)} aria-current={tab === item ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm ${tab === item ? "bg-foreground text-background" : "border text-muted-foreground hover:text-foreground"}`}>{item}{item === "Alerts" && unread > 0 ? ` ${unread}` : ""}</button>)}</nav>
    {notice && <p role="status" className="mt-5 rounded-xl border bg-muted/50 p-4 text-sm">{notice}</p>}

    {tab === "Buy" && <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-semibold">Browse live demo cars</h2><p className="mt-2 text-sm text-muted-foreground">New seller ads appear here after the moderator persona approves them.</p></div><p className="text-sm text-muted-foreground">{liveCars.length} cars</p></div>
      <div className="mt-6 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-muted-foreground">Keyword<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Make, model or area" className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" /></label><label className="text-xs text-muted-foreground">Make<select value={make} onChange={event => setMake(event.target.value)} className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"><option value="">Any make</option>{makes.map(value => <option key={value}>{value}</option>)}</select></label><label className="text-xs text-muted-foreground">City<select value={city} onChange={event => setCity(event.target.value)} className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"><option value="">All cities</option>{cities.map(value => <option key={value}>{value}</option>)}</select></label><label className="text-xs text-muted-foreground">Maximum price (lakh)<input type="number" min="0" value={maxLakh} onChange={event => setMaxLakh(event.target.value)} placeholder="Any budget" className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" /></label></div>
      {selected ? <CarDetail item={selected} saved={(state.saved[accountId] || []).includes(selected.id)} canBuy={account.role === "buyer"} onBack={() => setSelectedId(null)} onSave={() => { const next = commit(() => toggleDemoSave(state, accountId, selected.id), "Saved cars updated."); if (next && next.saved[accountId]?.includes(selected.id)) trackLocalEvent("listing_saved", { listing_id: selected.id }) }} onContact={() => contactSeller(selected)} reportReason={reportReason} setReportReason={setReportReason} onReport={() => { const next = commit(() => reportDemoListing(state, accountId, selected.id, reportReason), "Report sent to the demo moderator queue."); if (next) { setReportReason(""); trackLocalEvent("report_submitted", { listing_id: selected.id, target: "listing" }) } }} /> : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{liveCars.map(item => <CarTile key={item.id} item={item} onOpen={() => { openCar(item.id); trackLocalEvent("listing_clicked", { listing_id: item.id, source: "studio" }) }} />)}{liveCars.length === 0 && <p className="col-span-full rounded-2xl border p-10 text-center text-muted-foreground">No demo cars match. Try broader filters.</p>}</div>}
    </section>}

    {tab === "Saved" && <section className="mt-8"><h2 className="text-3xl font-semibold">Saved cars and searches</h2><p className="mt-2 text-sm text-muted-foreground">Select the buyer persona to save cars and get local price or sold alerts.</p><form onSubmit={event => { event.preventDefault(); const next = commit(() => saveDemoSearch(state, accountId, query), "Saved search added."); if (next) trackLocalEvent("saved_search_created", { source: "studio" }) }} className="mt-6 flex max-w-lg gap-2"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Save a model search, e.g. Vezel" className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 text-sm" /><button type="submit" className="rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background">Save search</button></form><div className="mt-5 flex flex-wrap gap-2">{state.savedSearches.filter(item => item.buyerId === accountId).map(item => <span key={item.id} className="rounded-full border px-3 py-1 text-xs" translate="no">{item.query}</span>)}</div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{state.listings.filter(item => (state.saved[accountId] || []).includes(item.id)).map(item => <CarTile key={item.id} item={item} onOpen={() => { switchTab("Buy"); openCar(item.id) }} />)}{!(state.saved[accountId] || []).length && <p className="rounded-2xl border p-8 text-sm text-muted-foreground">No saved cars yet. Open a car in Buy and tap Save.</p>}</div></section>}

    {tab === "Sell" && <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]"><div><h2 className="text-3xl font-semibold">Post a car ad</h2><p className="mt-2 text-sm text-muted-foreground">A guided form asks whether you are a private seller, reconditioned dealer, used car dealer or brand new car dealer. Add full specifications, four or more photos, papers declaration and price before demo review.</p><Link href="/post-ad" className="mt-6 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background">Start a new ad</Link></div><div><h2 className="text-3xl font-semibold">My demo listings</h2><p className="mt-2 text-sm text-muted-foreground">Choose the seller persona matching the ad to manage your stock. Moderator approval makes a sample ad visible in this browser.</p><div className="mt-6 space-y-4">{ownCars.map(item => <StockCard key={item.id} item={item} onSubmit={() => { const next = commit(() => submitDemoListing(state, accountId, item.id), "Listing sent to demo moderation."); if (next) trackLocalEvent("sell_step_completed", { step: "submitted" }) }} onPrice={price => commit(() => changeDemoPrice(state, accountId, item.id, price), "Demo asking price updated.")} onSold={soldVia => { const next = commit(() => markDemoSold(state, accountId, item.id, soldVia), "Listing marked sold in this browser."); if (next) trackLocalEvent("listing_marked_sold", { listing_id: item.id }) }} />)}{ownCars.length === 0 && <p className="rounded-2xl border p-8 text-sm text-muted-foreground">Switch to a seller persona and create an ad.</p>}</div></div></section>}

    {tab === "Dealer" && <section className="mt-8"><h2 className="text-3xl font-semibold">Dealer workspace</h2><p className="mt-2 text-sm text-muted-foreground">Select the demo showroom persona. Credits here are free demo credits; there is no purchase flow.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><Metric title="Demo credits" value={String(state.dealerCredits[accountId] || 0)} /><Metric title="Stock" value={String(ownCars.length)} /><Metric title="Leads" value={String(threads.length)} /></div><div className="mt-6 flex flex-wrap gap-3"><Link href="/post-ad" className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background">Create stock ad</Link><button type="button" onClick={() => switchTab("Inbox")} className="rounded-full border px-5 py-3 text-sm">Open leads inbox</button><Link href="/pricing" className="rounded-full border px-5 py-3 text-sm">View pricing hypotheses</Link></div><div className="mt-8 grid gap-4 md:grid-cols-2">{ownCars.map(item => <StockCard key={item.id} item={item} onSubmit={() => commit(() => submitDemoListing(state, accountId, item.id), "Stock ad sent to demo moderation.")} onPrice={price => commit(() => changeDemoPrice(state, accountId, item.id, price), "Demo asking price updated.")} onSold={soldVia => commit(() => markDemoSold(state, accountId, item.id, soldVia), "Stock marked sold in this browser.")} />)}</div></section>}

    {tab === "Inbox" && <section className="mt-8"><h2 className="text-3xl font-semibold">Messaging and leads</h2><p className="mt-2 text-sm text-muted-foreground">Messages are visible only when you switch personas in this same browser. They are not delivered to real people.</p><div className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]"><div className="space-y-2">{threads.map(thread => <button type="button" key={thread.id} onClick={() => setActiveThreadId(thread.id)} className={`block w-full rounded-xl border p-4 text-left text-sm ${activeThread?.id === thread.id ? "bg-muted" : "bg-card"}`}><strong>{state.listings.find(item => item.id === thread.listingId)?.title || "Car"}</strong><span className="mt-1 block text-xs text-muted-foreground">{thread.messages.length} messages · {thread.id}</span></button>)}{threads.length === 0 && <p className="rounded-xl border p-5 text-sm text-muted-foreground">No conversations for this persona. As buyer, open a live car and contact its seller.</p>}</div>{activeThread && <ConversationPanel thread={activeThread} accountId={accountId} message={message} setMessage={setMessage} onSubmit={submitMessage} />}</div></section>}

    {tab === "Alerts" && <section className="mt-8"><h2 className="text-3xl font-semibold">Notifications</h2><p className="mt-2 text-sm text-muted-foreground">Local demo alerts for price drops, listing status, saved searches and chat. No SMS, push or email is sent.</p><div className="mt-6 space-y-3">{alerts.map(item => <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4 text-sm"><div><p className={item.read ? "text-muted-foreground" : "font-semibold"}>{item.text}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(item.at).toLocaleString()}</p></div>{!item.read && <button type="button" onClick={() => commit(() => readDemoAlert(state, accountId, item.id), "Alert marked read.")} className="shrink-0 text-xs underline">Mark read</button>}</div>)}{alerts.length === 0 && <p className="rounded-xl border p-6 text-sm text-muted-foreground">No alerts for this persona yet.</p>}</div></section>}

    {tab === "Moderate" && <section className="mt-8"><h2 className="text-3xl font-semibold">Moderation queue</h2><p className="mt-2 text-sm text-muted-foreground">Select the moderator persona. These are local sample decisions; no real identity or document verification is performed.</p><div className="mt-6 grid gap-8 lg:grid-cols-2"><div><h3 className="text-xl font-semibold">Pending ads · {state.listings.filter(item => item.status === "pending").length}</h3><label className="mt-4 block text-xs text-muted-foreground">Reason if rejecting<input value={reviewReason} onChange={event => setReviewReason(event.target.value)} placeholder="What must the seller change?" className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label><div className="mt-4 space-y-4">{state.listings.filter(item => item.status === "pending").map(item => <div key={item.id} className="rounded-xl border bg-card p-5"><strong>{item.title}</strong><p className="mt-1 text-sm text-muted-foreground">{money(item.priceBdt)} · {item.sellerName} · {item.photos.length} photos</p><p className="mt-3 text-sm" translate="no">{item.description}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => { const next = commit(() => moderateDemoListing(state, accountId, item.id, true), "Demo listing approved."); if (next) trackLocalEvent("listing_published", { listing_id: item.id }) }} className="rounded-full bg-foreground px-4 py-2 text-xs text-background">Approve</button><button type="button" onClick={() => commit(() => moderateDemoListing(state, accountId, item.id, false, reviewReason), "Demo listing rejected and dealer credit returned if used.")} className="rounded-full border px-4 py-2 text-xs">Reject</button></div></div>)}{!state.listings.some(item => item.status === "pending") && <p className="mt-4 rounded-xl border p-6 text-sm text-muted-foreground">No pending ads.</p>}</div></div><div><h3 className="text-xl font-semibold">Open reports · {state.reports.filter(item => item.status === "open").length}</h3><div className="mt-4 space-y-4">{state.reports.filter(item => item.status === "open").map(report => <div key={report.id} className="rounded-xl border bg-card p-5"><strong>{state.listings.find(item => item.id === report.listingId)?.title || "Car"}</strong><p className="mt-2 text-sm text-muted-foreground" translate="no">{report.reason}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => commit(() => resolveDemoReport(state, accountId, report.id, false), "Report marked reviewed.")} className="rounded-full border px-4 py-2 text-xs">Dismiss after review</button><button type="button" onClick={() => commit(() => resolveDemoReport(state, accountId, report.id, true), "Car removed in the demo.")} className="rounded-full border px-4 py-2 text-xs">Remove car</button></div></div>)}{!state.reports.some(item => item.status === "open") && <p className="rounded-xl border p-6 text-sm text-muted-foreground">No open reports.</p>}</div></div></div></section>}
    <p className="mt-12 border-t pt-6 text-xs text-muted-foreground">Interactive prototype only. Browser storage is not a secure database; persona switching is not authentication, sample checks are not real verification, and no payment or external notification is connected.</p>
  </div></main>
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl border bg-card p-5"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div>
}

function CarTile({ item, onOpen }: { item: DemoListing; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="overflow-hidden rounded-2xl border bg-card text-left transition-transform hover:-translate-y-1"><div className="aspect-[4/3] bg-muted">{item.photos[0] && <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover" />}</div><div className="p-4"><p className="text-xs text-muted-foreground">{item.condition} · {item.city}</p><h3 className="mt-2 text-lg font-semibold">{item.title}</h3><p className="mt-3 text-xl font-semibold">{money(item.priceBdt)}</p><p className="mt-3 text-xs text-muted-foreground">{item.sellerName} · {item.sampleCheck ? "Sample check" : "Seller-provided details"}</p></div></button>
}

function CarDetail({ item, saved, canBuy, onBack, onSave, onContact, reportReason, setReportReason, onReport }: {
  item: DemoListing; saved: boolean; canBuy: boolean; onBack: () => void; onSave: () => void; onContact: () => void
  reportReason: string; setReportReason: (value: string) => void; onReport: () => void
}) {
  return <div className="mt-6 rounded-2xl border bg-card p-5"><button type="button" onClick={onBack} className="text-sm text-muted-foreground underline">← Back to cars</button><div className="mt-5 grid gap-8 lg:grid-cols-[1.25fr_1fr]"><div><div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">{item.photos[0] && <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover" />}</div><div className="mt-3 grid grid-cols-3 gap-3">{item.photos.slice(1).map((photo, index) => <img key={index} src={photo} alt={`${item.title} photo ${index + 2}`} className="aspect-[4/3] w-full rounded-lg object-cover" />)}</div></div><div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{item.condition} · {item.city}, {item.area}</p><h2 className="mt-3 text-3xl font-semibold">{item.title}</h2><p className="mt-4 text-3xl font-semibold">{money(item.priceBdt)}</p><dl className="mt-5 grid grid-cols-2 gap-3 border-y py-4 text-sm"><div><dt className="text-muted-foreground">Mileage</dt><dd>{item.mileageKm.toLocaleString()} km</dd></div><div><dt className="text-muted-foreground">Model year</dt><dd>{item.year}</dd></div><div><dt className="text-muted-foreground">Seller type</dt><dd>{item.sellerCategory?.replaceAll("_", " ") || item.sellerType}</dd></div><div><dt className="text-muted-foreground">Papers</dt><dd>{item.papersDeclared ? "Seller says available" : "Not declared"}</dd></div></dl><p className="mt-4 text-sm leading-relaxed text-muted-foreground" translate="no">{item.description}</p><p className="mt-4 rounded-lg border p-3 text-xs text-muted-foreground">{item.sampleCheck ? "Sample check badge only. No real vehicle or documents have been verified." : "Seller-provided details. No independent check is claimed."} {item.auctionSheetPhoto ? " Seller-provided auction sheet is unverified." : ""} Inspect the vehicle and original papers before paying anyone.</p><div className="mt-5 flex flex-wrap gap-2">{canBuy && <><button type="button" onClick={onSave} className="rounded-full border px-4 py-2 text-sm">{saved ? "Remove save" : "Save car"}</button><button type="button" onClick={onContact} className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">Message seller demo</button></>}<Link href="/safety" className="rounded-full border px-4 py-2 text-sm">Safety guide</Link></div>{canBuy && <div className="mt-6 border-t pt-5"><label className="block text-xs text-muted-foreground">Report a concern<textarea value={reportReason} onChange={event => setReportReason(event.target.value)} maxLength={500} placeholder="Describe copied photos, misleading price, or another concern" className="mt-2 min-h-20 w-full rounded-lg border bg-background p-3 text-sm" /></label><button type="button" onClick={onReport} className="mt-2 rounded-full border px-4 py-2 text-xs">Send demo report</button></div>}</div></div></div>
}

function StockCard({ item, onSubmit, onPrice, onSold }: { item: DemoListing; onSubmit: () => void; onPrice: (price: number) => void; onSold: (soldVia: DemoSoldVia) => void }) {
  const [price, setPrice] = useState(item.priceBdt)
  const [soldVia, setSoldVia] = useState<DemoSoldVia>("carbuy")
  return <div className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-lg font-semibold">{item.title}</h3><span className="rounded-full border px-2 py-1 text-xs capitalize">{item.status}</span></div><p className="mt-2 text-sm text-muted-foreground">{money(item.priceBdt)} · {item.city} · {item.photos.length} photos · {item.sellerCategory?.replaceAll("_", " ") || item.sellerType}</p>{item.moderatorNote && <p className="mt-3 text-xs text-amber-300">Review note: {item.moderatorNote}</p>}<div className="mt-4 flex flex-wrap gap-2">{(item.status === "draft" || item.status === "rejected") && <><Link href={`/post-ad?edit=${item.id}`} className="rounded-full border px-4 py-2 text-xs">Edit ad</Link><button type="button" onClick={onSubmit} className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background">Submit for review</button></>}{item.status === "live" && <><input aria-label={`New price for ${item.title}`} type="number" min="100000" value={price} onChange={event => setPrice(Number(event.target.value))} className="w-32 rounded-full border bg-background px-3 py-2 text-xs" /><button type="button" onClick={() => onPrice(price)} className="rounded-full border px-3 py-2 text-xs">Update price</button><select aria-label="Sale outcome" value={soldVia} onChange={event => setSoldVia(event.target.value as DemoSoldVia)} className="rounded-full border bg-background px-3 py-2 text-xs"><option value="carbuy">Sold through CarBuy</option><option value="elsewhere">Sold elsewhere</option><option value="showroom_trade_in">Showroom trade-in</option><option value="didnt_sell">Did not sell</option></select><button type="button" onClick={() => onSold(soldVia)} className="rounded-full border px-3 py-2 text-xs">Close ad</button></>}</div></div>
}

function ConversationPanel({ thread, accountId, message, setMessage, onSubmit }: { thread: DemoConversation; accountId: string; message: string; setMessage: (value: string) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="flex min-h-80 flex-col rounded-xl border bg-card"><div className="border-b p-4 text-sm font-semibold">Conversation {thread.id} · demo only</div><div className="flex-1 space-y-3 p-4">{thread.messages.map(row => <div key={row.id} className={`max-w-[85%] rounded-xl p-3 text-sm ${row.fromId === accountId ? "ml-auto bg-foreground text-background" : "bg-muted"}`}><p translate="no">{row.text}</p><p className="mt-1 text-[0.65rem] opacity-60">{new Date(row.at).toLocaleTimeString()}</p></div>)}{thread.messages.length === 0 && <p className="text-sm text-muted-foreground">Start with a question about the car. Phone numbers and links are blocked in this demo.</p>}</div><form onSubmit={onSubmit} className="flex gap-2 border-t p-3"><input value={message} onChange={event => setMessage(event.target.value)} maxLength={500} placeholder="Ask about the car…" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" /><button type="submit" className="rounded-lg bg-foreground px-4 py-2 text-sm text-background">Send</button></form></div>
}
