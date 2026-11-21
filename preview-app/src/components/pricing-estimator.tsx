"use client"

import { useState } from "react"
import { priceHypothesesBdt } from "@/lib/pricing"
import { useLanguage } from "@/lib/language-client"

const money = (amount: number) => `৳${amount.toLocaleString("en-BD")}`

export function PricingEstimator() {
  const language = useLanguage()
  const text = (en: string, bn: string) => language === "bn" ? bn : en
  const [cars, setCars] = useState(1)
  const [top, setTop] = useState(false)
  const [featured, setFeatured] = useState(false)
  const [urgent, setUrgent] = useState(false)
  const [sheet, setSheet] = useState(false)
  const total = cars * priceHypothesesBdt.private_listing +
    (top ? priceHypothesesBdt.top_7d : 0) +
    (featured ? priceHypothesesBdt.featured_7d : 0) +
    (urgent ? priceHypothesesBdt.urgent_7d : 0) +
    (sheet ? priceHypothesesBdt.auction_sheet : 0)
  return <div className="rounded-[1.75rem] border bg-card p-6 sm:p-8">
    <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{text("Private seller estimate", "ব্যক্তিগত বিক্রেতার হিসাব")}</p>
    <h2 className="mt-3 text-2xl font-semibold">{text("Plan a listing", "বিজ্ঞাপনের খরচ দেখুন")}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{text("Illustrative subtotal only. Pricing, tax and any coupon are confirmed before a live checkout.", "এটি শুধু নমুনা মোট খরচ। আসল পেমেন্টের আগে মূল্য, কর ও কুপন নিশ্চিত করা হবে।")}</p>
    <label className="mt-6 block text-sm font-medium" htmlFor="car-count">{text("Number of cars", "গাড়ির সংখ্যা")}</label>
    <select id="car-count" className="mt-2 w-full rounded-xl border bg-background px-4 py-3" value={cars} onChange={e => setCars(Number(e.target.value))}>
      {[1, 2, 3].map(n => <option key={n} value={n}>{n} {text(n === 1 ? "car" : "cars", "টি গাড়ি")}</option>)}
    </select>
    <div className="mt-5 space-y-3 text-sm">
      {[
        { label: text("Top placement · 7 days", "শীর্ষে দেখানো · ৭ দিন"), price: priceHypothesesBdt.top_7d, value: top, set: setTop },
        { label: text("Featured placement · 7 days", "বিশেষভাবে দেখানো · ৭ দিন"), price: priceHypothesesBdt.featured_7d, value: featured, set: setFeatured },
        { label: text("Urgent badge · 7 days", "জরুরি ব্যাজ · ৭ দিন"), price: priceHypothesesBdt.urgent_7d, value: urgent, set: setUrgent },
        { label: text("Auction-sheet request · manual", "অকশন শিটের অনুরোধ · ম্যানুয়াল"), price: priceHypothesesBdt.auction_sheet, value: sheet, set: setSheet },
      ].map(item => <label key={item.label} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <span className="flex items-center gap-3"><input type="checkbox" checked={item.value} onChange={e => item.set(e.target.checked)} className="size-4 accent-foreground" />{item.label}</span>
        <span className="whitespace-nowrap text-muted-foreground">+{money(item.price)}</span>
      </label>)}
    </div>
    <div className="mt-6 flex items-end justify-between border-t pt-5"><span className="text-sm text-muted-foreground">{text("Illustrative subtotal", "নমুনা মোট খরচ")}</span><strong className="text-3xl">{money(total)}</strong></div>
    <p className="mt-3 text-xs text-muted-foreground">{text("No payment is taken in this preview. Boosts are optional and paid placement must be labelled on real listings.", "এই প্রিভিউতে কোনো টাকা নেওয়া হয় না। অতিরিক্ত প্রচার ঐচ্ছিক; আসল বিজ্ঞাপনে অর্থের বিনিময়ে প্রচার স্পষ্টভাবে দেখাতে হবে।")}</p>
  </div>
}
