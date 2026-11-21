import type { Metadata } from "next"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { PricingContent } from "@/components/pricing-content"

export const metadata: Metadata = {
  title: "Pricing hypotheses | CarBuy preview",
  description: "See illustrative listing, boost, dealer-credit and auction-sheet prices for the CarBuy Bangladesh prototype.",
}

export default function PricingPage() {
  return <><SiteHeader /><PricingContent /><SiteFooter /></>
}
