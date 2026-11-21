import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { featuredListings } from "@/lib/mock-listings"
import { DetailTelemetry } from "@/components/analytics-telemetry"

export function generateStaticParams() { return featuredListings.map(car => ({ id: car.id })) }

export default async function CarDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const car = featuredListings.find(item => item.id === id)
  if (!car) notFound()
  return <><DetailTelemetry listingId={car.id} /><SiteHeader /><main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-14">
    <Link href="/cars" className="text-sm text-muted-foreground hover:text-foreground">← Sample cars</Link>
    <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-muted"><Image src={car.photo.src} alt={car.photo.alt} fill unoptimized className="object-cover" /></div>
      <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Illustrative listing</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{car.year} {car.make} {car.model}</h1>
        <p className="mt-2 text-xl text-muted-foreground">{car.trim}</p>
        <p className="mt-8 text-4xl font-semibold">৳ {car.priceBdt.toLocaleString("en-BD")}</p>
        <dl className="mt-8 grid grid-cols-2 gap-4 border-y py-6 text-sm"><div><dt className="text-muted-foreground">Mileage</dt><dd>{car.mileageKm.toLocaleString()} km</dd></div><div><dt className="text-muted-foreground">Fuel</dt><dd>{car.fuel}</dd></div><div><dt className="text-muted-foreground">Transmission</dt><dd>{car.transmission}</dd></div><div><dt className="text-muted-foreground">Location</dt><dd>{car.area}, {car.city}</dd></div></dl>
        <p className="mt-7 rounded-xl border p-4 text-sm text-muted-foreground">Visual preview only. This is sample inventory; there is no real seller contact or transaction on this public demo.</p>
      </div>
    </div>
  </main><SiteFooter /></>
}
