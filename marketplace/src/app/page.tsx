import Link from "next/link"
import { Suspense } from "react"
import { SiteHeader } from "@/components/home/site-header"
import { Container } from "@/components/home/section"
import { CarCard } from "@/components/market/car-card"
import { homeData } from "@/lib/carbuy-api"

async function FreshCars() {
  let data: Awaited<ReturnType<typeof homeData>> | null = null
  try { data = await homeData() } catch { /* The local inventory service may be stopped. */ }
  if (!data) return <p className="mt-12 rounded-2xl border p-8 text-muted-foreground">The local inventory service is offline. Start it with <code>cd search && npm run demo</code>.</p>
  return <>
      <div className="mt-14 flex flex-wrap items-end justify-between gap-6">
        <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Explore the prototype</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Cars to discover</h2></div>
        <Link href="/cars" className="rounded-full border px-5 py-3 text-sm font-semibold hover:bg-foreground hover:text-background">Browse all {data.total} sample cars</Link>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{data.newListings.map(car => <CarCard key={car.id} car={car} />)}</div>
      <div className="mt-14 flex flex-wrap gap-3">{data.budgets.map(b => <Link key={b.maxLakh} href={`/cars?priceMax=${b.maxLakh}`} className="rounded-full border px-5 py-3 text-sm hover:bg-muted">Under ৳{b.maxLakh} lakh · {b.count}</Link>)}</div>
    </>
}

export default function Home() {
  return <>
    <SiteHeader />
    <main className="flex-1">
      <div className="border-y bg-muted/60 py-3 text-center text-sm font-medium">Product preview · cars, sellers, prices and badges are sample data · no real transactions</div>
      <Container className="py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">CarBuy Bangladesh</p>
        <h1 className="mt-6 max-w-5xl text-[clamp(3.5rem,9vw,8.5rem)] font-semibold leading-[0.9] tracking-[-0.07em]">Find your <span className="text-muted-foreground">next drive.</span></h1>
        <p className="mt-8 max-w-2xl text-lg text-muted-foreground">Compare cars by price, location and the specific checks shown on each listing. See what the seller has provided before you make contact.</p>
        <form action="/cars" className="mt-10 flex max-w-3xl gap-2 rounded-2xl border bg-card p-2 shadow-sm">
          <input name="q" aria-label="Search cars" placeholder="Search Axio, Vezel, Noah…" className="min-w-0 flex-1 bg-transparent px-4 outline-none" />
          <button className="rounded-xl bg-foreground px-6 py-4 text-sm font-semibold text-background">Search cars</button>
        </form>
        <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground"><Link href="/cars?body=suv" className="hover:text-foreground">SUVs</Link><Link href="/cars?body=sedan" className="hover:text-foreground">Sedans</Link><Link href="/cars?district=dhaka" className="hover:text-foreground">Dhaka</Link><Link href="/safety" className="hover:text-foreground">Buying safely</Link></div>
        <Suspense fallback={<p className="mt-16">Loading cars…</p>}><FreshCars /></Suspense>
      </Container>
    </main>
    <footer className="border-t py-10 text-center text-sm text-muted-foreground">CarBuy preview · <Link href="/safety" className="underline">Safety</Link> · <Link href="/listing-rules" className="underline">Listing rules</Link> · <Link href="/privacy" className="underline">Privacy draft</Link></footer>
  </>
}
