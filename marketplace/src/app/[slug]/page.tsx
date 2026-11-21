import { Suspense } from "react"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { GuideContent } from "@/components/guide-content"
import { contentPages } from "@/lib/content"

export function generateStaticParams() { return Object.keys(contentPages).map(slug => ({ slug })) }

async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!contentPages[slug]) notFound()
  return <GuideContent slug={slug} />
}

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  return <><SiteHeader /><Suspense fallback={<main className="flex-1 p-12">Loading guide…</main>}><Guide params={params} /></Suspense><SiteFooter /></>
}
