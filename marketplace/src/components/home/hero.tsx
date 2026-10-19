"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRightIcon, BadgeCheckIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { formatLakh } from "@/lib/format"
import { getListing, heroPlates } from "@/lib/mock-listings"
import { cn } from "@/lib/utils"

import { easeOut } from "./reveal"
import { SearchPanel } from "./search-panel"
import { Container } from "./section"

const PLATE_MS = 6500

function HeadlineLine({
  children,
  delay,
  className,
}: {
  children: React.ReactNode
  delay: number
  className?: string
}) {
  // The wrapper clips the line while it slides up; the padding keeps descenders visible.
  return (
    <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
      <motion.span
        className={cn("block", className)}
        initial={{ y: "105%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1, ease: easeOut, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function HeroPlate() {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = setInterval(() => setActive((i) => (i + 1) % heroPlates.length), PLATE_MS)
    return () => clearInterval(timer)
  }, [reduceMotion])

  const listing = getListing(heroPlates[active].listingId)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: easeOut, delay: 0.35 }}
      className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-muted sm:aspect-[16/10] lg:aspect-[21/9]"
    >
      {heroPlates.map((plate, i) => (
        <motion.div
          key={plate.listingId}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 1.06 }}
          transition={{
            opacity: { duration: 1.2, ease: "easeInOut" },
            scale: { duration: PLATE_MS / 1000 + 1.2, ease: "linear" },
          }}
          aria-hidden={i !== active}
        >
          <Image
            src={plate.photo.src}
            alt={plate.photo.alt}
            fill
            sizes="(min-width: 1400px) 1320px, 100vw"
            // All plates sit above the fold; only the first one competes for bandwidth.
            loading="eager"
            fetchPriority={i === 0 ? "high" : "low"}
            quality={80}
            className="object-cover"
          />
        </motion.div>
      ))}

      {/* Legibility scrim for the caption; stays neutral so the photo is the only colour. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/0 to-black/0" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-6 p-5 text-white sm:p-7">
        {listing && (
          <Link
            href={`/cars/${listing.id}`}
            prefetch={false}
            className="group max-w-xs"
          >
            <p className="font-mono text-[0.65rem] tracking-[0.18em] text-white/70 uppercase">
              On CarBuy now
            </p>
            {/* Re-keyed per plate so the caption fades with its photo. */}
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: easeOut, delay: 0.3 }}
            >
              <p className="mt-2 text-base font-semibold tracking-tight sm:text-xl">
                {listing.make} {listing.model}
                <span className="hidden sm:inline"> {listing.trim}</span>
                <span className="font-normal text-white/70"> · {listing.year}</span>
              </p>
              <p className="mt-0.5 text-sm text-white/80">
                ৳ {formatLakh(listing.priceBdt)} · {listing.area}, {listing.city}
                <ArrowRightIcon className="ml-1.5 inline size-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </motion.div>
          </Link>
        )}
        <div className="flex shrink-0 gap-1.5 pt-1.5" role="group" aria-label="Featured photos">
          {heroPlates.map((plate, i) => (
            <button
              key={plate.listingId}
              type="button"
              aria-pressed={i === active}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setActive(i)}
              className="relative h-6 w-5 sm:w-10"
            >
              <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/35">
                {i === active && (
                  <motion.span
                    key={`${active}-progress`}
                    className="absolute inset-y-0 left-0 w-full origin-left bg-white"
                    initial={{ scaleX: reduceMotion ? 1 : 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: PLATE_MS / 1000, ease: "linear" }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative pb-16 sm:pb-24">
      <Container className="pt-10 sm:pt-16 lg:pt-20">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="inline-flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 text-[0.8rem] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[0.7rem] font-medium text-background">
            <BadgeCheckIcon className="size-3" />
            Verified
          </span>
          12,480 papers-checked cars
          <span className="hidden sm:inline"> across 64 districts</span>
        </motion.p>

        <h1
          id="hero-title"
          className="mt-7 text-[clamp(3.1rem,11vw,10rem)] leading-[0.9] font-semibold tracking-[-0.055em]"
        >
          <HeadlineLine delay={0.1}>Verified cars.</HeadlineLine>
          <HeadlineLine delay={0.22} className="text-muted-foreground">
            Honest prices.
          </HeadlineLine>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.45 }}
          className="mt-8 grid gap-7 sm:mt-10 lg:grid-cols-12 lg:items-end"
        >
          <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground lg:col-span-6 xl:col-span-5">
            Reconditioned and used cars from inspected showrooms and owners in Dhaka,
            Chattogram, Sylhet and beyond — with BRTA papers checked before you ever
            visit.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-6 lg:justify-self-end xl:col-span-7">
            <Link
              href="/cars"
              prefetch={false}
              className={cn(buttonVariants(), "group h-12 gap-2 rounded-full px-6 text-[0.95rem]")}
            >
              Browse all cars
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/sell"
              prefetch={false}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 rounded-full px-6 text-[0.95rem]"
              )}
            >
              Get a free valuation
            </Link>
          </div>
        </motion.div>
      </Container>

      <Container className="mt-10 sm:mt-14">
        <HeroPlate />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: easeOut, delay: 0.6 }}
          className="relative z-10 -mt-20 px-2 sm:-mt-28 sm:px-6 lg:px-10"
        >
          <SearchPanel />
        </motion.div>
      </Container>
    </section>
  )
}
