import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { Container } from "@/components/home/section"
import { PricingEstimator } from "@/components/pricing-estimator"
import { markets, priceHypothesesBdt as prices } from "@/lib/pricing"

export const metadata: Metadata = {
  title: "Pricing hypotheses | CarBuy preview",
  description: "See illustrative listing, boost, dealer-credit and auction-sheet prices for the CarBuy Bangladesh prototype.",
}

const money = (amount: number) => `৳${amount.toLocaleString("en-BD")}`

export default function PricingPage() {
  const market = markets.BD
  return <><SiteHeader /><main className="flex-1">
    <Container className="py-12 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CarBuy · {market.currency} · planning prices</p>
      <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">Clear costs before you list.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">These are starting hypotheses from the product plan, not an offer or a working checkout. We will test prices with local sellers and show the final amount before taking any payment.</p>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr]"><PricingEstimator />
        <div className="space-y-6">
          <section className="rounded-[1.75rem] border bg-card p-6 sm:p-8"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Private seller</p><h2 className="mt-3 text-2xl font-semibold">One car. One clear fee.</h2><p className="mt-4 text-4xl font-semibold">{money(prices.private_listing)}</p><p className="mt-2 text-sm text-muted-foreground">Illustrative price for a 60-day listing. A renewal would be quoted separately. Optional boosts do not change the vehicle’s verification status.</p></section>
          <section className="rounded-[1.75rem] border bg-card p-6 sm:p-8"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Trust service</p><h2 className="mt-3 text-2xl font-semibold">Auction-sheet request</h2><p className="mt-4 text-4xl font-semibold">{money(prices.auction_sheet)}</p><p className="mt-2 text-sm text-muted-foreground">Manual fulfilment is a planning assumption. No sheet provider is connected. The demo commerce service refunds an order when a requested sheet is not found.</p></section>
        </div>
      </div>
      <section className="mt-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">For showrooms</p><h2 className="mt-3 text-3xl font-semibold">Dealer credits</h2></div><p className="max-w-md text-sm text-muted-foreground">One credit is intended to publish one car for 30 days. Founding-dealer grants are decided during onboarding.</p></div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">{[
          { count: 10, price: prices.dealer_10 },
          { count: 50, price: prices.dealer_50 },
          { count: 200, price: prices.dealer_200 },
        ].map(pack => <div key={pack.count} className="rounded-2xl border bg-card p-6"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{pack.count} credits</p><p className="mt-5 text-3xl font-semibold">{money(pack.price)}</p><p className="mt-2 text-sm text-muted-foreground">{money(pack.price / pack.count)} per car-month, illustrative</p></div>)}</div>
      </section>
      <div className="mt-12 rounded-2xl border bg-muted/50 p-6 text-sm leading-relaxed text-muted-foreground">No checkout, coupon redemption or real paid placement is active in the public preview. Final prices, taxes, receipts, refund rules and payment provider require launch approval. <Link href="/dealer-sign-up" className="text-foreground underline">View dealer information</Link>.</div>
    </Container>
  </main><SiteFooter /></>
}
