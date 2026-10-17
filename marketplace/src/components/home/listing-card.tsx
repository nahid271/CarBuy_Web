"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "motion/react"
import { BadgeCheckIcon, HeartIcon, MapPinIcon } from "lucide-react"

import { estimateEmi, formatKm, formatLakh, formatTaka } from "@/lib/format"
import type { Listing } from "@/lib/mock-listings"
import { cn } from "@/lib/utils"

export function ListingCard({ listing }: { listing: Listing }) {
  const [saved, setSaved] = useState(false)
  const title = `${listing.make} ${listing.model}`
  const emi = Math.round(estimateEmi(listing.priceBdt) / 100) * 100

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="group/card relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border bg-card text-card-foreground transition-shadow duration-500 hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)] dark:hover:shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={listing.photo.src}
          alt={listing.photo.alt}
          fill
          sizes="(min-width: 1280px) 340px, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 86vw"
          className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/25" />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            {listing.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-medium text-black shadow-sm">
                <BadgeCheckIcon className="size-3.5" />
                Verified
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-black/45 px-2.5 py-1 text-[0.7rem] font-medium text-white backdrop-blur-md">
              {listing.condition}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSaved((s) => !s)}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
            className="relative z-10 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/65"
          >
            <HeartIcon className={cn("size-4 transition-transform", saved && "scale-110 fill-white")} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight">
            <Link
              href={`/cars/${listing.id}`}
              prefetch={false}
              className="outline-none after:absolute after:inset-0 after:rounded-[1.5rem] focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {title}
            </Link>
          </h3>
          <span className="font-mono text-xs text-muted-foreground">{listing.year}</span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{listing.trim}</p>

        {/* On narrow cards the EMI hint wraps under the price rather than squeezing it. */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <p className="text-2xl font-semibold tracking-[-0.03em] whitespace-nowrap">
            <span className="mr-1 font-normal text-muted-foreground">৳</span>
            {formatLakh(listing.priceBdt)}
          </p>
          <p className="pb-1 text-xs whitespace-nowrap text-muted-foreground">
            EMI from <span className="text-foreground">{formatTaka(emi)}</span>/mo
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-3 border-y py-3 text-[0.8rem]">
          <div>
            <dt className="sr-only">Mileage</dt>
            <dd>{formatKm(listing.mileageKm)}</dd>
          </div>
          <div className="border-l pl-3">
            <dt className="sr-only">Fuel</dt>
            <dd>{listing.fuel === "Plug-in hybrid" ? "PHEV" : listing.fuel}</dd>
          </div>
          <div className="border-l pl-3">
            <dt className="sr-only">Transmission</dt>
            <dd>{listing.transmission === "Automatic" ? "Auto" : "Manual"}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[0.8rem] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="truncate">{listing.city}</span>
          </span>
          <span className="truncate">{listing.seller.name}</span>
        </div>
      </div>
    </motion.article>
  )
}
