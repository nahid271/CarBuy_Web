"use client"

import { useCallback, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import Autoplay from "embla-carousel-autoplay"
import { useReducedMotion } from "motion/react"
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { featuredListings } from "@/lib/mock-listings"

import { ListingCard } from "./listing-card"
import { Reveal } from "./reveal"
import { Container, SectionHeading } from "./section"

function useCarouselState(api: CarouselApi | undefined) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!api) return () => {}
      api.on("select", onChange).on("reInit", onChange)
      return () => {
        api.off("select", onChange).off("reInit", onChange)
      }
    },
    [api]
  )
  const selected = useSyncExternalStore(
    subscribe,
    () => api?.selectedScrollSnap() ?? 0,
    () => 0
  )
  const snapCount = useSyncExternalStore(
    subscribe,
    () => api?.scrollSnapList().length ?? 0,
    () => 0
  )
  const canPrev = useSyncExternalStore(subscribe, () => api?.canScrollPrev() ?? false, () => false)
  const canNext = useSyncExternalStore(subscribe, () => api?.canScrollNext() ?? true, () => true)
  return { selected, snapCount, canPrev, canNext }
}

export function FeaturedListings() {
  const reduceMotion = useReducedMotion()
  const [api, setApi] = useState<CarouselApi>()
  const { selected, snapCount, canPrev, canNext } = useCarouselState(api)

  // No autoplay for people who prefer reduced motion.
  const plugins = useMemo(
    () =>
      reduceMotion
        ? []
        : [Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })],
    [reduceMotion]
  )

  const progress = snapCount > 1 ? (selected + 1) / snapCount : 1

  return (
    <section id="listings" aria-labelledby="listings-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="listings-title"
          index="01"
          eyebrow="Featured"
          title="Fresh on CarBuy this week."
          description="Hand-picked from verified showrooms and owners. Every car below has had its papers checked against BRTA records."
          action={
            <Link
              href="/cars"
              prefetch={false}
              className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
            >
              View all 12,480 cars
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />

        <Reveal delay={0.1} className="mt-12">
          <Carousel
            setApi={setApi}
            opts={{ align: "start", loop: false }}
            plugins={plugins}
            aria-label="Featured listings"
          >
            {/* Extra bottom padding keeps the hover lift and shadow from being clipped. */}
            <CarouselContent className="-ml-4 pt-2 pb-10 sm:-ml-5">
              {featuredListings.map((listing) => (
                <CarouselItem
                  key={listing.id}
                  className="basis-[86%] pl-4 sm:basis-1/2 sm:pl-5 lg:basis-1/3 xl:basis-1/4"
                >
                  <ListingCard listing={listing} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="mt-0 flex items-center gap-6">
            <p className="font-mono text-xs tracking-widest text-muted-foreground tabular-nums">
              <span className="text-foreground">{String(selected + 1).padStart(2, "0")}</span>
              {" / "}
              {String(Math.max(snapCount, 1)).padStart(2, "0")}
            </p>
            <div className="relative h-px flex-1 bg-border">
              <div
                className="absolute inset-y-0 left-0 h-px origin-left bg-foreground transition-transform duration-500 ease-out"
                style={{ width: "100%", transform: `scaleX(${progress})` }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon-lg"
                className="rounded-full"
                onClick={() => api?.scrollPrev()}
                disabled={!canPrev}
                aria-label="Previous listings"
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                className="rounded-full"
                onClick={() => api?.scrollNext()}
                disabled={!canNext}
                aria-label="Next listings"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
