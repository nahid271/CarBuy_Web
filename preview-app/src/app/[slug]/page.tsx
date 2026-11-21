import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { GuideContent } from "@/components/guide-content"
import { contentPages } from "@/lib/content"

const extras: Record<string, { title: string; body: string }> = {
  dealers: { title: "For dealers", body: "Showroom onboarding and stock management need the live backend. This page is a visual preview only." },
  financing: { title: "Financing", body: "Finance figures in this design are illustrative. No lender or loan application is connected." },
}

export function generateStaticParams() { return [...Object.keys(contentPages), ...Object.keys(extras)].map(slug => ({ slug })) }

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (contentPages[slug]) return <><SiteHeader /><GuideContent slug={slug} previewOnly /><SiteFooter /></>
  const page = extras[slug]
  if (!page) notFound()
  return <><SiteHeader /><main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-20">
    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
    <p className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CarBuy · visual preview</p>
    <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-7xl">{page.title}</h1>
    <p className="mt-8 max-w-2xl text-lg text-muted-foreground">{page.body}</p>
    <Link href="/cars" className="mt-10 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background">Explore sample cars</Link>
  </main><SiteFooter /></>
}
