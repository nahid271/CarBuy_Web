"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-client"

type Channel = "whatsapp" | "facebook" | "web_share" | "copy_link"

function shareUrl(channel: Channel) {
  const url = new URL(window.location.pathname, window.location.origin)
  url.searchParams.set("utm_source", channel)
  url.searchParams.set("utm_medium", "share")
  url.searchParams.set("utm_campaign", "listing")
  return url.toString()
}

export function ShareListing({ title }: { title: string }) {
  const language = useLanguage()
  const [message, setMessage] = useState("")
  const [manualLink, setManualLink] = useState("")
  const sampleText = language === "bn"
    ? `CarBuy-এর নমুনা গাড়ির বিজ্ঞাপন: ${title}। এটি আসল বিক্রির বিজ্ঞাপন নয়।`
    : `CarBuy sample car listing: ${title}. This is an illustrative preview, not a live sale.`

  const open = (channel: "whatsapp" | "facebook") => {
    const link = shareUrl(channel)
    const destination = channel === "whatsapp"
      ? `https://wa.me/?text=${encodeURIComponent(`${sampleText} ${link}`)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
    window.open(destination, "_blank", "noopener,noreferrer")
  }

  const copy = async () => {
    const link = shareUrl("copy_link")
    try {
      await navigator.clipboard.writeText(link)
      setMessage(language === "bn" ? "লিংক কপি হয়েছে" : "Link copied")
      setManualLink("")
    } catch {
      setMessage(language === "bn" ? "নিচের লিংক কপি করুন" : "Select and copy the link below")
      setManualLink(link)
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) { await copy(); return }
    try { await navigator.share({ title: `CarBuy · ${title}`, text: sampleText, url: shareUrl("web_share") }) }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) await copy() }
  }

  return <section aria-label={language === "bn" ? "বিজ্ঞাপন শেয়ার করুন" : "Share listing"} className="mt-7 rounded-2xl border bg-card p-5">
    <h2 className="font-semibold">{language === "bn" ? "এই নমুনা বিজ্ঞাপন শেয়ার করুন" : "Share this sample listing"}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{language === "bn" ? "লিংকটি প্রিভিউ খুলবে; এখানে বিক্রেতার সঙ্গে লেনদেন করা যায় না।" : "The link opens a preview; no seller transaction is available here."}</p>
    <div className="mt-4 flex flex-wrap gap-2 text-sm">
      <button type="button" onClick={() => open("whatsapp")} className="rounded-full border px-4 py-2 hover:bg-muted">WhatsApp</button>
      <button type="button" onClick={() => open("facebook")} className="rounded-full border px-4 py-2 hover:bg-muted">Facebook</button>
      <button type="button" onClick={nativeShare} className="rounded-full border px-4 py-2 hover:bg-muted">{language === "bn" ? "আরও শেয়ার" : "More"}</button>
      <button type="button" onClick={copy} className="rounded-full border px-4 py-2 hover:bg-muted">{language === "bn" ? "লিংক কপি" : "Copy link"}</button>
    </div>
    {message && <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p>}
    {manualLink && <input readOnly aria-label="Share link" value={manualLink} onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border bg-background p-2 text-xs" />}
  </section>
}
