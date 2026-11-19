import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/home/site-header"
import { Container } from "@/components/home/section"
import { contentPages } from "@/lib/content"
import { Suspense } from "react"

export function generateStaticParams(){return Object.keys(contentPages).map(slug=>({slug}))}
async function Guide({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,page=contentPages[slug]
  if(!page)notFound()
  return <><SiteHeader /><main className="flex-1"><Container className="max-w-4xl py-16"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">CarBuy guide</p><h1 className="mt-4 text-5xl font-semibold tracking-tight">{page.title[0]}</h1><p className="mt-6 text-lg text-muted-foreground">{page.intro[0]}</p>
    <div className="mt-10 space-y-4">{page.sections.map(section=><section key={section.heading[0]} className="rounded-2xl border bg-card p-7"><h2 className="text-2xl font-semibold">{section.heading[0]}</h2><p className="mt-4 leading-relaxed text-muted-foreground">{section.body[0]}</p></section>)}</div>
    {slug==="safety"&&<section className="mt-6 rounded-2xl border bg-card p-7"><h2 className="text-2xl font-semibold">Ownership transfer</h2><p className="mt-4 text-muted-foreground">Check the current forms, documents and fees together on the official BRTA portal before completing a transfer.</p><a href="https://bsp.brta.gov.bd/ownershipTransfer" className="mt-3 inline-block underline">BRTA ownership-transfer guidance</a></section>}
    {slug==="sell-your-car"&&<a href="http://127.0.0.1:4173/" className="mt-8 inline-block rounded-full bg-foreground px-6 py-4 font-semibold text-background">Open local seller studio</a>}
    {slug==="dealer-sign-up"&&<a href="http://127.0.0.1:4174/" className="mt-8 inline-block rounded-full bg-foreground px-6 py-4 font-semibold text-background">Open local dealer portal</a>}
    <Link href="/cars" className="mt-10 inline-block rounded-full border px-5 py-3">Browse sample cars</Link>
  </Container></main></>
}
export default function GuidePage({params}:{params:Promise<{slug:string}>}){
  return <Suspense fallback={<p>Loading guide…</p>}><Guide params={params} /></Suspense>
}
