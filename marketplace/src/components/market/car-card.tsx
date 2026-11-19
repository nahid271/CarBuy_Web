/* eslint-disable @next/next/no-img-element -- Images already arrive as resized WebP from the local media service. */
import Link from "next/link"
import type { CarCard as Car } from "@/lib/carbuy-api"

export function CarCard({ car }: { car: Car }) {
  return <article className="group overflow-hidden rounded-[1.4rem] border bg-card transition-transform hover:-translate-y-1">
    <Link href={`/cars/${car.id}`} className="block">
      <div className="relative aspect-[4/3] bg-muted">
        {car.coverKey && <img src={`/media/${encodeURIComponent(car.coverKey)}`} alt={car.title} className="h-full w-full object-cover" loading="lazy" />}
        <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">Sample listing</span>
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{car.condition} · {car.year} · {car.district}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight">{car.title}</h3>
        <p className="mt-3 text-2xl font-semibold">৳ {car.priceLakh.toLocaleString("en-BD")} <span className="text-sm font-normal text-muted-foreground">lakh</span></p>
        <p className="mt-2 text-sm text-muted-foreground">{car.mileageKm.toLocaleString("en-BD")} km · {car.fuel} · {car.area}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {car.papersChecked && <span className="rounded-full border px-2 py-1">Sample papers check</span>}
          {car.auctionVerified && <span className="rounded-full border px-2 py-1">Sample auction check</span>}
          {car.verifiedDealer && <span className="rounded-full border px-2 py-1">Sample dealer badge</span>}
        </div>
      </div>
    </Link>
  </article>
}
