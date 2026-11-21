"use client"
/* eslint-disable @next/next/no-img-element -- Sample media arrives in an optimized WebP size from the local service. */

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowUpRightIcon, MapPinIcon } from "lucide-react"
import type { CarCard } from "@/lib/carbuy-api"
import { formatKm, formatLakh } from "@/lib/format"
import { trackLocalEvent } from "@/lib/analytics-client"

export function ListingCard({ car }: { car: CarCard }) {
  return <motion.article
    whileHover={{ y: -6 }}
    transition={{ type: "spring", stiffness: 300, damping: 26 }}
    className="group/card relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border bg-card text-card-foreground transition-shadow duration-500 hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)] dark:hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]"
  >
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
      {car.coverKey && <img src={`/media/${encodeURIComponent(car.coverKey)}`} alt={car.title} loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.04]" />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/25" />
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-medium text-black shadow-sm">Sample listing</span>
          {car.papersChecked && <span className="rounded-full bg-black/55 px-2.5 py-1 text-[0.7rem] text-white">Sample papers check</span>}
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md"><ArrowUpRightIcon className="size-4" /></span>
      </div>
    </div>
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight"><Link href={`/cars/${car.id}`} onClick={() => trackLocalEvent("listing_clicked", { listing_id: car.id, source: "card" })} className="outline-none after:absolute after:inset-0 after:rounded-[1.5rem] focus-visible:after:ring-2 focus-visible:after:ring-ring">{car.title}</Link></h3>
        <span className="font-mono text-xs text-muted-foreground">{car.year}</span>
      </div>
      <p className="mt-1 text-sm capitalize text-muted-foreground">{car.condition}</p>
      <p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">৳ {formatLakh(car.priceBdt)}</p>
      <dl className="mt-4 grid grid-cols-2 border-y py-3 text-[0.8rem]">
        <div><dt className="sr-only">Mileage</dt><dd>{formatKm(car.mileageKm)}</dd></div>
        <div className="border-l pl-3"><dt className="sr-only">Fuel</dt><dd className="capitalize">{car.fuel}</dd></div>
      </dl>
      <p className="mt-auto flex items-center gap-1.5 pt-4 text-[0.8rem] text-muted-foreground"><MapPinIcon className="size-3.5" />{car.area}, {car.district}</p>
    </div>
  </motion.article>
}
