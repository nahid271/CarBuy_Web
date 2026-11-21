"use client"

import { useEffect, useState } from "react"
import { localAnalyticsEvents, type LocalEvent } from "@/lib/analytics-client"
import {
  budgetLines, budgetTotal, discoveryTargets, milestones, monthlyCostLines,
  openQuestions, releaseGates, risks,
  type BudgetLineId, type DiscoveryId, type MilestoneId, type MonthlyCostId, type QuestionId,
} from "@/lib/launch"
import { markets } from "@/lib/pricing"

type PlannerState = {
  budget: Partial<Record<BudgetLineId, number>>
  monthly: Partial<Record<MonthlyCostId, number>>
  discovery: Partial<Record<DiscoveryId, number>>
  milestones: Partial<Record<MilestoneId, boolean>>
  reviewedRisks: string[]
  decisions: Partial<Record<QuestionId, string>>
}

const storageKey = "carbuy.launch.workbench.v1"
const blank: PlannerState = { budget: {}, monthly: {}, discovery: {}, milestones: {}, reviewedRisks: [], decisions: {} }
const tabs = ["Overview", "Budget", "Discovery", "Risks", "Decisions", "Analytics"] as const
type Tab = typeof tabs[number]
const money = (value: number) => `৳${Math.round(value).toLocaleString("en-BD")}`
const number = (value: unknown, maximum = 100_000_000) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum ? value : undefined

function readState(): PlannerState {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) || "null")
    if (!raw || typeof raw !== "object") return blank
    const data = raw as Partial<PlannerState>
    return {
      budget: Object.fromEntries(budgetLines.flatMap(line => { const value = number(data.budget?.[line.id]); return value === undefined ? [] : [[line.id, value]] })) as PlannerState["budget"],
      monthly: Object.fromEntries(monthlyCostLines.flatMap(line => { const value = number(data.monthly?.[line.id]); return value === undefined ? [] : [[line.id, value]] })) as PlannerState["monthly"],
      discovery: Object.fromEntries(discoveryTargets.flatMap(line => { const value = number(data.discovery?.[line.id], 100_000); return value === undefined ? [] : [[line.id, value]] })) as PlannerState["discovery"],
      milestones: Object.fromEntries(milestones.map(line => [line.id, data.milestones?.[line.id] === true])) as PlannerState["milestones"],
      reviewedRisks: Array.isArray(data.reviewedRisks) ? data.reviewedRisks.filter(id => typeof id === "string" && risks.some(risk => risk.id === id)) : [],
      decisions: Object.fromEntries(openQuestions.flatMap(line => { const value = data.decisions?.[line.id]; return typeof value === "string" ? [[line.id, value.slice(0, 500)]] : [] })) as PlannerState["decisions"],
    }
  } catch { return blank }
}

export function LaunchWorkbench() {
  const [state, setState] = useState<PlannerState>(blank)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>("Overview")
  const [events, setEvents] = useState<LocalEvent[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => { setState(readState()); setLoaded(true) }, 0)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* Planning remains usable without storage. */ }
  }, [loaded, state])

  const chooseTab = (next: Tab) => {
    setTab(next)
    if (next === "Analytics") setEvents(localAnalyticsEvents())
  }
  const exportPlan = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), plan: state }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "carbuy-launch-plan.json"
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const totalMonthly = monthlyCostLines.reduce((sum, line) => sum + (state.monthly[line.id] || 0), 0)
  const decisionCount = openQuestions.filter(item => state.decisions[item.id]?.trim()).length
  const doneMilestones = milestones.filter(item => state.milestones[item.id]).length
  return <main className="flex-1"><div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 lg:px-10 lg:py-20">
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CarBuy · PRD sections 16–25</p>
    <div className="mt-4 flex flex-wrap items-end justify-between gap-6"><div><h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">Launch workbench.</h1><p className="mt-5 max-w-2xl text-lg text-muted-foreground">Track the business decisions behind the marketplace. This planning demo saves only in this browser; it does not approve a real launch.</p></div><button type="button" onClick={exportPlan} className="rounded-full border px-5 py-3 text-sm font-medium hover:bg-muted">Export my plan</button></div>
    <div className="mt-10 grid gap-4 sm:grid-cols-3"><Metric label="Planning budget" value={money(budgetTotal(state.budget))} note="PRD baseline or your local edits" /><Metric label="Questions with notes" value={`${decisionCount} / ${openQuestions.length}`} note="Draft notes, not approved decisions" /><Metric label="Milestones marked" value={`${doneMilestones} / ${milestones.length}`} note="Self-reported planning progress" /></div>
    <nav aria-label="Workbench sections" className="mt-10 flex flex-wrap gap-2 border-b pb-4">{tabs.map(item => <button key={item} type="button" onClick={() => chooseTab(item)} aria-current={tab === item ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm transition-colors ${tab === item ? "bg-foreground text-background" : "border text-muted-foreground hover:text-foreground"}`}>{item}</button>)}</nav>

    {tab === "Overview" && <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]"><section className="rounded-2xl border bg-card p-6"><h2 className="text-2xl font-semibold">Release gates</h2><p className="mt-2 text-sm text-muted-foreground">Each gate needs real evidence and an owner before CarBuy can accept real users or payments.</p><ul className="mt-6 space-y-3">{releaseGates.map(gate => <li key={gate.id} className="flex gap-3 border-t pt-3 text-sm"><span className="mt-0.5 size-2 shrink-0 rounded-full bg-amber-400" /><span><strong>{gate.label}</strong><span className="ml-2 text-xs text-muted-foreground">PRD §{gate.section} · open</span></span></li>)}</ul></section>
      <div className="space-y-6"><section className="rounded-2xl border bg-card p-6"><h2 className="text-2xl font-semibold">Markets</h2><div className="mt-5 space-y-3">{Object.values(markets).map(market => <div key={market.code} className="flex items-center justify-between border-t pt-3 text-sm"><span>{market.code} · {market.currency}</span><span className="text-muted-foreground">{market.status === "active_demo" ? "Active demo" : "Discovery only"}</span></div>)}</div></section><section className="rounded-2xl border bg-card p-6"><h2 className="text-2xl font-semibold">Public preview boundary</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">The GitHub Pages marketplace shows sample cars, local analytics choices, pricing hypotheses and bilingual guides. Accounts, verified paperwork, payments, Android distribution and hosted services are separate launch work.</p></section></div></div>}

    {tab === "Budget" && <div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border bg-card p-6"><h2 className="text-2xl font-semibold">One-time allocation</h2><p className="mt-2 text-sm text-muted-foreground">PRD numbers are illustrative, not current quotes. Edit them to model a plan; values stay in this browser.</p><div className="mt-6 space-y-3">{budgetLines.map(line => <label key={line.id} className="flex items-center justify-between gap-4 border-t pt-3 text-sm"><span>{line.label}</span><input type="number" min="0" max="100000000" value={state.budget[line.id] ?? line.baselineBdt} onChange={event => { const value = number(Number(event.target.value)); if (value !== undefined) setState(previous => ({ ...previous, budget: { ...previous.budget, [line.id]: value } })) }} className="w-36 rounded-lg border bg-background px-3 py-2 text-right" /></label>)}</div><p className="mt-6 border-t pt-4 text-right text-2xl font-semibold">{money(budgetTotal(state.budget))}</p></section>
      <section className="rounded-2xl border bg-card p-6"><h2 className="text-2xl font-semibold">Monthly provider quotes</h2><p className="mt-2 text-sm text-muted-foreground">Enter actual BDT quotes once providers respond. Zero means no quote recorded here.</p><div className="mt-6 space-y-3">{monthlyCostLines.map(line => <label key={line.id} className="flex items-center justify-between gap-4 border-t pt-3 text-sm"><span>{line.label}</span><input type="number" min="0" max="100000000" value={state.monthly[line.id] ?? 0} onChange={event => { const value = number(Number(event.target.value)); if (value !== undefined) setState(previous => ({ ...previous, monthly: { ...previous.monthly, [line.id]: value } })) }} className="w-36 rounded-lg border bg-background px-3 py-2 text-right" /></label>)}</div><p className="mt-6 border-t pt-4 text-right text-2xl font-semibold">{money(totalMonthly)} <span className="text-sm font-normal text-muted-foreground">/ month</span></p></section></div>}

    {tab === "Discovery" && <div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border bg-card p-6"><h2 className="text-2xl font-semibold">Supply and interviews</h2><p className="mt-2 text-sm text-muted-foreground">PRD discovery targets. Record completed conversations or onboarded dealers; do not count scraped listings.</p><div className="mt-6 space-y-4">{discoveryTargets.map(line => <label key={line.id} className="flex items-center justify-between gap-4 border-t pt-4 text-sm"><span>{line.label} <span className="text-muted-foreground">/ {line.target}</span></span><input type="number" min="0" max="100000" value={state.discovery[line.id] ?? 0} onChange={event => { const value = number(Number(event.target.value), 100_000); if (value !== undefined) setState(previous => ({ ...previous, discovery: { ...previous.discovery, [line.id]: value } })) }} className="w-24 rounded-lg border bg-background px-3 py-2 text-right" /></label>)}</div></section>
      <section className="rounded-2xl border bg-card p-6"><h2 className="text-2xl font-semibold">Milestones</h2><p className="mt-2 text-sm text-muted-foreground">These are relative PRD targets; reset their dates once the project schedule is agreed.</p><div className="mt-6 space-y-3">{milestones.map(item => <label key={item.id} className="flex cursor-pointer items-start gap-3 border-t pt-4 text-sm"><input type="checkbox" checked={state.milestones[item.id] === true} onChange={event => setState(previous => ({ ...previous, milestones: { ...previous.milestones, [item.id]: event.target.checked } }))} className="mt-1 size-4 accent-foreground" /><span><strong>{item.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{item.target}</span></span></label>)}</div></section></div>}

    {tab === "Risks" && <div className="mt-8 grid gap-4 md:grid-cols-2">{risks.map(item => <section key={item.id} className="rounded-2xl border bg-card p-6"><div className="flex justify-between gap-3"><p className="font-mono text-xs text-muted-foreground">{item.id}</p><label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={state.reviewedRisks.includes(item.id)} onChange={event => setState(previous => ({ ...previous, reviewedRisks: event.target.checked ? [...previous.reviewedRisks, item.id] : previous.reviewedRisks.filter(id => id !== item.id) }))} />Reviewed</label></div><h2 className="mt-3 text-xl font-semibold">{item.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.mitigation}</p></section>)}</div>}

    {tab === "Decisions" && <div className="mt-8 grid gap-4 md:grid-cols-2">{openQuestions.map(item => <section key={item.id} className="rounded-2xl border bg-card p-6"><p className="font-mono text-xs text-muted-foreground">{item.id} · {state.decisions[item.id]?.trim() ? "draft note" : "open"}</p><h2 className="mt-3 text-lg font-semibold">{item.question}</h2><label className="mt-4 block text-xs text-muted-foreground">Your private planning note<textarea maxLength={500} value={state.decisions[item.id] || ""} onChange={event => setState(previous => ({ ...previous, decisions: { ...previous.decisions, [item.id]: event.target.value } }))} placeholder="Record a candidate, evidence or next action" className="mt-2 min-h-24 w-full rounded-xl border bg-background p-3 text-sm text-foreground" /></label></section>)}</div>}

    {tab === "Analytics" && <section className="mt-8 rounded-2xl border bg-card p-6"><h2 className="text-2xl font-semibold">Consented browser events</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">This view counts only events in your browser. It is a demonstration of the PRD funnel vocabulary, not a production dashboard or a measure of marketplace demand.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="Searches" value={String(events.filter(event => event.name === "search_performed").length)} note="Local search events" /><Metric label="Listing clicks" value={String(events.filter(event => event.name === "listing_clicked").length)} note="Local card clicks" /><Metric label="Detail views" value={String(events.filter(event => event.name === "vdp_viewed").length)} note="Local sample views" /></div><button type="button" onClick={() => setEvents(localAnalyticsEvents())} className="mt-6 rounded-full border px-4 py-2 text-sm">Refresh counts</button></section>}
    <p className="mt-8 text-xs text-muted-foreground">All notes and edits on this page are saved only in this browser. Export them before clearing site data. A checked item is not independent verification or legal approval.</p>
  </div></main>
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border bg-card p-5"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p></div>
}
