import Link from "next/link"
import { Suspense } from "react"
import { SampleCarResults } from "@/components/sample-car-results"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"

export default function CarsPage() {
  return <><SiteHeader /><main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-14">
    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
    <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CarBuy · visual preview</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Explore sample cars.</h1>
    <p className="mt-4 max-w-2xl text-muted-foreground">Filter this illustrative set by make, model, budget, year and location. Prices and sellers are sample data; no transaction is available here.</p>
    <Suspense fallback={<p className="mt-10 text-muted-foreground">Loading sample cars…</p>}><SampleCarResults /></Suspense>
  </main><SiteFooter /></>
}
