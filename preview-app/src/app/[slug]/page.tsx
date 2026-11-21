import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"

const pages: Record<string, { title: string; body: string }> = {
  "sell-your-car": { title: "Sell your car", body: "Seller registration and listing workflows are part of the full local application. This public page is a visual design preview." },
  "dealer-sign-up": { title: "For dealers", body: "Dealer onboarding and showroom management require the live backend. This public page shows the visual direction only." },
  "dealers": { title: "For dealers", body: "Dealer onboarding and showroom management require the live backend. This public page shows the visual direction only." },
  "safety": { title: "Buy with care", body: "Inspect the vehicle and original papers in person. Any badges and verification steps shown in this design preview are illustrative." },
  "help": { title: "Help", body: "This is a public design preview. Support and contact services are not active." },
  "financing": { title: "Financing", body: "Finance figures shown in the design are illustrative. No lender or loan application is connected to this preview." },
  "contact": { title: "Contact", body: "This is a public design preview. Contact services are not active." },
  "how-it-works": { title: "How it works", body: "This is a public visual preview of CarBuy’s seller and buyer journeys." },
  "auction-sheets": { title: "Auction sheets", body: "Ask for the original auction sheet and compare its details to the car. No independent verification is offered in this public preview." },
  "about": { title: "About CarBuy", body: "CarBuy is a Bangladesh-focused car marketplace prototype. This public preview demonstrates the CarBuy design direction." },
  "listing-rules": { title: "Listing rules", body: "The full seller listing and moderation rules are part of the local application and are not active on this public preview." },
  "privacy": { title: "Privacy draft", body: "This public visual preview does not accept account registrations, messages or payments." },
}

export function generateStaticParams() { return Object.keys(pages).map(slug => ({ slug })) }

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = pages[slug]
  if (!page) notFound()
  return <><SiteHeader /><main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-20">
    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
    <p className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CarBuy · visual preview</p>
    <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-7xl">{page.title}</h1>
    <p className="mt-8 max-w-2xl text-lg text-muted-foreground">{page.body}</p>
    <Link href="/cars" className="mt-10 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background">Explore sample cars</Link>
  </main><SiteFooter /></>
}
