"use client"

import Link from "next/link"
import { Container } from "@/components/home/section"
import { PricingEstimator } from "@/components/pricing-estimator"
import { useLanguage } from "@/lib/language-client"
import { markets, priceHypothesesBdt as prices } from "@/lib/pricing"

const money = (amount: number) => `৳${amount.toLocaleString("en-BD")}`

export function PricingContent() {
  const language = useLanguage()
  const text = (en: string, bn: string) => language === "bn" ? bn : en
  const market = markets.BD
  return <main className="flex-1"><Container className="py-12 sm:py-20">
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CarBuy · {market.currency} · {text("planning prices", "পরিকল্পিত মূল্য")}</p>
    <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">{text("Clear costs before you list.", "বিজ্ঞাপন দেওয়ার আগেই খরচ জানুন।")}</h1>
    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{text("These are starting hypotheses from the product plan, not an offer or a working checkout. We will test prices with local sellers and show the final amount before taking any payment.", "এগুলো পণ্য পরিকল্পনার প্রাথমিক মূল্য ধারণা; কোনো চূড়ান্ত অফার বা চালু পেমেন্ট ব্যবস্থা নয়। স্থানীয় বিক্রেতাদের সঙ্গে যাচাই করে টাকা নেওয়ার আগে চূড়ান্ত মূল্য দেখানো হবে।")}</p>
    <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr]"><PricingEstimator />
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border bg-card p-6 sm:p-8"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{text("Private seller", "ব্যক্তিগত বিক্রেতা")}</p><h2 className="mt-3 text-2xl font-semibold">{text("One car. One clear fee.", "একটি গাড়ি। একটি স্পষ্ট ফি।")}</h2><p className="mt-4 text-4xl font-semibold">{money(prices.private_listing)}</p><p className="mt-2 text-sm text-muted-foreground">{text("Illustrative price for a 60-day listing. A renewal would be quoted separately. Optional boosts do not change the vehicle’s verification status.", "৬০ দিনের বিজ্ঞাপনের নমুনা মূল্য। নবায়নের মূল্য আলাদা দেখানো হবে। ঐচ্ছিক প্রচার গাড়ির যাচাই অবস্থা বদলায় না।")}</p></section>
        <section className="rounded-[1.75rem] border bg-card p-6 sm:p-8"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{text("Trust service", "যাচাই সেবা")}</p><h2 className="mt-3 text-2xl font-semibold">{text("Auction-sheet request", "অকশন শিটের অনুরোধ")}</h2><p className="mt-4 text-4xl font-semibold">{money(prices.auction_sheet)}</p><p className="mt-2 text-sm text-muted-foreground">{text("Manual fulfilment is a planning assumption. No sheet provider is connected. The demo commerce service refunds an order when a requested sheet is not found.", "ম্যানুয়াল সেবা একটি পরিকল্পনা মাত্র। কোনো শিট প্রদানকারী সংযুক্ত নেই। ডেমো সেবায় শিট না পাওয়া গেলে অর্ডারের টাকা ফেরত দেখানো হয়।")}</p></section>
      </div>
    </div>
    <section className="mt-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{text("For showrooms", "শোরুমের জন্য")}</p><h2 className="mt-3 text-3xl font-semibold">{text("Dealer credits", "ডিলার ক্রেডিট")}</h2></div><p className="max-w-md text-sm text-muted-foreground">{text("One credit is intended to publish one car for 30 days. Founding-dealer grants are decided during onboarding.", "একটি ক্রেডিট দিয়ে একটি গাড়ি ৩০ দিনের জন্য প্রকাশের পরিকল্পনা আছে। প্রাথমিক ডিলারদের বিনামূল্যে ক্রেডিট নিবন্ধনের সময় নির্ধারিত হবে।")}</p></div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{[
        { count: 10, price: prices.dealer_10 }, { count: 50, price: prices.dealer_50 }, { count: 200, price: prices.dealer_200 },
      ].map(pack => <div key={pack.count} className="rounded-2xl border bg-card p-6"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{pack.count} {text("credits", "ক্রেডিট")}</p><p className="mt-5 text-3xl font-semibold">{money(pack.price)}</p><p className="mt-2 text-sm text-muted-foreground">{money(pack.price / pack.count)} {text("per car-month, illustrative", "প্রতি গাড়ি-মাস, নমুনা")}</p></div>)}</div>
    </section>
    <div className="mt-12 rounded-2xl border bg-muted/50 p-6 text-sm leading-relaxed text-muted-foreground">{text("No checkout, coupon redemption or real paid placement is active in this preview. Final prices, taxes, receipts, refund rules and payment provider require launch approval.", "এই প্রিভিউতে পেমেন্ট, কুপন ব্যবহার বা আসল অর্থের বিনিময়ে প্রচার চালু নেই। চূড়ান্ত মূল্য, কর, রসিদ, টাকা ফেরতের নিয়ম ও পেমেন্ট প্রদানকারী চালুর আগে অনুমোদন করতে হবে।")} <Link href="/dealer-sign-up" className="text-foreground underline">{text("View dealer information", "ডিলারের তথ্য দেখুন")}</Link>.</div>
  </Container></main>
}
