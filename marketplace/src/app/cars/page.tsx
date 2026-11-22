import Link from "next/link"
import { Suspense } from "react"
import { SiteHeader } from "@/components/home/site-header"
import { Container } from "@/components/home/section"
import { ListingCard } from "@/components/home/listing-card"
import { searchCars } from "@/lib/carbuy-api"
import { SearchTelemetry } from "@/components/analytics-telemetry"
import { LocalizedText } from "@/components/ui-language-surface"

type Params = Promise<Record<string,string|string[]|undefined>>
const keys = new Set(["q","condition","make","model","priceMin","priceMax","yearMin","yearMax","mileageMax","fuel","body","transmission","seller","district","auctionVerified","papersChecked","verifiedDealer","sort","page"])
async function Results({ searchParams }: { searchParams: Params }) {
  const input = await searchParams, query = new URLSearchParams()
  for (const [key,value] of Object.entries(input)) if (keys.has(key)) for (const item of Array.isArray(value)?value:[value]) if (item) query.append(key,item)
  let data
  try { data = await searchCars(query) }
  catch { return <p className="rounded-2xl border p-8">Search is unavailable. Check that the local inventory service is running and your filters are valid.</p> }
  const make = typeof input.make === "string" ? input.make : ""
  const page = data.page
  const pageLink = (next: number) => { const copy = new URLSearchParams(query); copy.set("page",String(next)); return `/cars?${copy}` }
  return <>
    <SearchTelemetry resultCount={data.total} filterCount={[...query.keys()].filter(key => key !== "page" && key !== "sort").length} sort={typeof input.sort === "string" ? input.sort : "best_match"} />
    <p className="mb-6 text-sm text-muted-foreground"><LocalizedText text={`${data.total} sample cars found`} /></p>
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="h-fit rounded-2xl border bg-card p-5">
        <form action="/cars" className="space-y-5 text-sm">
          <label className="block">Keyword<input name="q" defaultValue={typeof input.q==="string"?input.q:""} className="mt-2 w-full rounded-lg border bg-background px-3 py-2" placeholder="Model or location" /></label>
          <label className="block">Make<select name="make" defaultValue={make} className="mt-2 w-full rounded-lg border bg-background px-3 py-2"><option value="">Any make</option>{data.facets.make?.filter(x=>x.count).map(x=><option key={x.id} value={x.id}>{x.label} ({x.count})</option>)}</select></label>
          <label className="block">Maximum price (lakh)<input type="number" name="priceMax" min="0" defaultValue={typeof input.priceMax==="string"?input.priceMax:""} className="mt-2 w-full rounded-lg border bg-background px-3 py-2" /></label>
          <label className="block">Body<select name="body" defaultValue={typeof input.body==="string"?input.body:""} className="mt-2 w-full rounded-lg border bg-background px-3 py-2"><option value="">Any body</option>{data.facets.body?.filter(x=>x.count).map(x=><option key={x.id} value={x.id}>{x.label} ({x.count})</option>)}</select></label>
          <label className="block">District<select name="district" defaultValue={typeof input.district==="string"?input.district:""} className="mt-2 w-full rounded-lg border bg-background px-3 py-2"><option value="">Anywhere</option>{data.facets.district?.filter(x=>x.count).map(x=><option key={x.id} value={x.id}>{x.label} ({x.count})</option>)}</select></label>
          <label className="block">Sort<select name="sort" defaultValue={typeof input.sort==="string"?input.sort:"best_match"} className="mt-2 w-full rounded-lg border bg-background px-3 py-2"><option value="best_match">Best match</option><option value="newest">Newest</option><option value="price_asc">Lowest price</option><option value="price_desc">Highest price</option></select></label>
          <button className="w-full rounded-lg bg-foreground px-4 py-3 font-semibold text-background">Show cars</button>
        </form>
      </aside>
      <div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.cards.map(car=><ListingCard key={car.id} car={car} />)}</div>
        {!data.cards.length&&<p className="rounded-2xl border p-12 text-center">No cars match these filters. Try a broader search.</p>}
        {data.totalPages>1&&<nav className="mt-10 flex justify-center gap-4">{page>1&&<Link href={pageLink(page-1)} className="rounded-full border px-5 py-2">Previous</Link>}<span className="px-3 py-2"><LocalizedText text={`Page ${page} of ${data.totalPages}`} /></span>{page<data.totalPages&&<Link href={pageLink(page+1)} className="rounded-full border px-5 py-2">Next</Link>}</nav>}
      </div>
    </div>
  </>
}
export default function CarsPage({searchParams}:{searchParams:Params}) {
  return <><SiteHeader /><main className="flex-1"><Container className="py-12"><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">CarBuy preview</p><h1 className="mb-8 mt-4 text-5xl font-semibold tracking-tight">Cars for sale</h1><Suspense fallback={<p>Searching…</p>}><Results searchParams={searchParams} /></Suspense></Container></main></>
}
