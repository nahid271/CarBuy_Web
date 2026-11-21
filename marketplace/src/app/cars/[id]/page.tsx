/* eslint-disable @next/next/no-img-element -- The media service provides optimized WebP images. */
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { SiteHeader } from "@/components/home/site-header"
import { Container } from "@/components/home/section"
import { ListingCard } from "@/components/home/listing-card"
import { carDetail } from "@/lib/carbuy-api"
import { DetailTelemetry } from "@/components/analytics-telemetry"
import { ShareListing } from "@/components/share-listing"

async function Detail({params}:{params:Promise<{id:string}>}) {
  const {id}=await params
  const car=await carDetail(id)
  if(!car)notFound()
  return <>
    <DetailTelemetry listingId={car.id} />
    <nav className="mb-8 text-sm text-muted-foreground"><Link href="/cars" className="hover:text-foreground">Cars</Link> / {car.title}</nav>
    <div className="rounded-2xl border bg-muted/60 p-4 text-sm">Sample listing and simulated trust badges. Inspect a real car and original papers before paying anyone.</div>
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-muted">{car.photos[0]&&<img src={`/media/${encodeURIComponent(car.photos[0].webpKey)}`} alt={car.title} className="h-full w-full object-cover" />}</div>
        <div className="mt-3 grid grid-cols-3 gap-3">{car.photos.slice(1,4).map((photo,i)=><div key={i} className="aspect-[4/3] overflow-hidden rounded-xl bg-muted"><img src={`/media/${encodeURIComponent(photo.webpKey)}`} alt={`${car.title} photo ${i+2}`} className="h-full w-full object-cover" loading="lazy" /></div>)}</div>
      </div>
      <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{car.condition} · {car.area}, {car.district}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{car.title}</h1>
        <p className="mt-6 text-4xl font-semibold">৳ {car.priceLakh.toLocaleString("en-BD")} <span className="text-lg font-normal text-muted-foreground">lakh</span></p>
        <dl className="mt-7 grid grid-cols-2 gap-4 border-y py-6 text-sm">{[["Mileage",`${car.mileageKm.toLocaleString("en-BD")} km`],["Engine",`${car.engineCc} cc`],["Fuel",car.fuel],["Transmission",car.transmission],["Body",car.body],["Registration",car.registrationYear??"—"]].map(([name,value])=><div key={name}><dt className="text-muted-foreground">{name}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">{car.trust.papersChecked&&<span className="rounded-full border px-3 py-2">Sample papers check</span>}{car.trust.auctionStatus==="verified"&&<span className="rounded-full border px-3 py-2">Sample auction check</span>}</div>
        <div className="mt-7 rounded-2xl border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Seller</p><p className="mt-2 text-xl font-semibold">{car.seller.name}</p><p className="text-sm text-muted-foreground">{car.seller.type === "dealer" ? "Showroom" : "Private seller"} · sample identity</p>
          <a href={`http://127.0.0.1:4175/car/${encodeURIComponent(car.id)}`} className="mt-5 block rounded-xl bg-foreground px-5 py-4 text-center text-sm font-semibold text-background">Open interactive detail and chat demo</a>
          <p className="mt-3 text-xs text-muted-foreground">The interactive module uses a separate local demo account.</p></div>
        <ShareListing title={car.title} />
      </div>
    </div>
    <section className="mt-12 max-w-3xl"><h2 className="text-2xl font-semibold">Description</h2><p className="mt-4 leading-relaxed text-muted-foreground">{car.description.text}</p>
      <h2 className="mt-10 text-2xl font-semibold">Buy safely</h2><p className="mt-4 leading-relaxed text-muted-foreground">Check the chassis, registration certificate, owner identity, tax token and fitness documents in person. Do not send an advance to a seller you have not met.</p><Link href="/safety" className="mt-3 inline-block underline">Read the safety guide</Link></section>
    {car.similar.length>0&&<section className="mt-16"><h2 className="text-3xl font-semibold">Similar sample cars</h2><div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{car.similar.map(item=><ListingCard key={item.id} car={item} />)}</div></section>}
  </>
}
export default function CarPage({params}:{params:Promise<{id:string}>}) {
  return <><SiteHeader /><main className="flex-1"><Container className="py-10"><Suspense fallback={<p>Loading car…</p>}><Detail params={params} /></Suspense></Container></main></>
}
