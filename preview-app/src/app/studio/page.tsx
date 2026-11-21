import type { Metadata } from "next"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { DemoStudio } from "@/components/demo-studio"

export const metadata: Metadata = {
  title: "Interactive marketplace demo | CarBuy",
  description: "Try sample buyer, seller, dealer and moderation journeys in your browser. No real accounts, sellers or payments are connected.",
  robots: { index: false, follow: false },
}

export default function StudioPage() {
  return <><SiteHeader /><DemoStudio /><SiteFooter /></>
}
