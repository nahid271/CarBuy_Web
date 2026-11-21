"use client"

import { useEffect, useState } from "react"
import { analyticsConsent, clearLocalAnalytics, localAnalyticsEvents, setAnalyticsConsent, type AnalyticsConsent } from "@/lib/analytics-client"

export function AnalyticsPreferencesButton() {
  return <button type="button" className="underline underline-offset-2 hover:text-foreground"
    onClick={() => window.dispatchEvent(new Event("carbuy:analytics-preferences"))}>Analytics choices</button>
}

export function AnalyticsControls() {
  const [consent, setConsent] = useState<AnalyticsConsent>("unset")
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  useEffect(() => {
    const initialize = window.setTimeout(() => {
      const current = analyticsConsent()
      setConsent(current)
      setOpen(current === "unset")
      setCount(localAnalyticsEvents().length)
    }, 0)
    const show = () => { setCount(localAnalyticsEvents().length); setOpen(true) }
    window.addEventListener("carbuy:analytics-preferences", show)
    return () => { window.clearTimeout(initialize); window.removeEventListener("carbuy:analytics-preferences", show) }
  }, [])
  if (!open) return null
  const choose = (next: Exclude<AnalyticsConsent, "unset">) => {
    setAnalyticsConsent(next)
    setConsent(next)
    setCount(next === "declined" ? 0 : localAnalyticsEvents().length)
    setOpen(false)
  }
  const download = () => {
    const blob = new Blob([JSON.stringify(localAnalyticsEvents(), null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "carbuy-local-analytics.json"
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section role="dialog" aria-label="Analytics choices" className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-xl rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl sm:p-6">
    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Your privacy</p>
    <h2 className="mt-2 text-xl font-semibold">Choose local demo analytics</h2>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">With your permission, this preview records basic browsing and demo action events in this browser only. No names, phone numbers, search terms or payment data are collected. Nothing is sent to CarBuy or another service.</p>
    {consent === "accepted" && <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span>{count} events in this browser</span>
      <button type="button" className="underline" onClick={download}>Download events</button>
      <button type="button" className="underline" onClick={() => { clearLocalAnalytics(); setCount(0) }}>Delete events</button>
    </div>}
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" onClick={() => choose("accepted")} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">Allow</button>
      <button type="button" onClick={() => choose("declined")} className="rounded-full border px-5 py-2.5 text-sm font-medium">Decline</button>
      {consent !== "unset" && <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2.5 text-sm text-muted-foreground">Close</button>}
    </div>
  </section>
}
