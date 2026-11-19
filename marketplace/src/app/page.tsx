import { Suspense } from "react"
import { BodyTypes } from "@/components/home/body-types"
import { FeaturedListings } from "@/components/home/featured-listings"
import { Hero } from "@/components/home/hero"
import { Makes } from "@/components/home/makes"
import { SellBand } from "@/components/home/sell-band"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { Testimonials } from "@/components/home/testimonials"
import { TrustStrip } from "@/components/home/trust-strip"
import { WhyCarBuy } from "@/components/home/why-carbuy"
import { homeData } from "@/lib/carbuy-api"

async function InventoryCarousel() {
  let data: Awaited<ReturnType<typeof homeData>> | null = null
  try { data = await homeData() } catch { /* The preview can still show its shell while inventory is stopped. */ }
  return <FeaturedListings cars={data?.newListings ?? []} total={data?.total ?? 0} />
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-y bg-muted/60 px-4 py-2 text-center text-xs text-muted-foreground">Product preview · listings, sellers and trust badges are sample data · no real transactions</div>
        <Hero />
        <TrustStrip />
        <Suspense fallback={<div className="mx-auto max-w-[1400px] px-6 py-20 text-muted-foreground">Loading sample cars…</div>}><InventoryCarousel /></Suspense>
        <BodyTypes />
        <Makes />
        <WhyCarBuy />
        <Testimonials />
        <SellBand />
      </main>
      <SiteFooter />
    </>
  )
}
