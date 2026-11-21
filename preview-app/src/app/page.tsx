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

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-y bg-muted/60 px-4 py-2 text-center text-xs text-muted-foreground">CarBuy marketplace preview · cars, sellers and trust badges are sample data · no real transactions</div>
        <Hero />
        <TrustStrip />
        <FeaturedListings />
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
