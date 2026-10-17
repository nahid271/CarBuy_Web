import Image from "next/image"
import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"

import { formatCount } from "@/lib/format"
import { bodyTypes, type BodyType } from "@/lib/mock-listings"
import { cn } from "@/lib/utils"

import { Stagger, StaggerItem } from "./reveal"
import { Container, SectionHeading } from "./section"

function BodyTypeTile({ type, featured }: { type: BodyType; featured?: boolean }) {
  return (
    <Link
      href={`/cars?body=${type.slug}`}
      prefetch={false}
      className="group relative block h-full overflow-hidden rounded-[1.5rem] bg-muted text-white"
    >
      {/* Greyscale until hovered or focused: the photo earns its colour on intent. */}
      <Image
        src={type.photo.src}
        alt={type.photo.alt}
        fill
        sizes={featured ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
        className="object-cover grayscale transition-[filter,scale] duration-700 ease-out group-hover:scale-[1.04] group-hover:grayscale-0 group-focus-visible:grayscale-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/0" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
        <div>
          <h3
            className={cn(
              "font-semibold tracking-[-0.03em]",
              featured ? "text-3xl sm:text-5xl" : "text-xl sm:text-2xl"
            )}
          >
            {type.name}
          </h3>
          <p className="mt-1 text-sm text-white/75">
            {formatCount(type.count)} cars
            <span className="hidden sm:inline"> · {type.blurb}</span>
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/40 transition-colors duration-300 group-hover:border-white group-hover:bg-white group-hover:text-black">
          <ArrowUpRightIcon className="size-4" />
        </span>
      </div>
    </Link>
  )
}

export function BodyTypes() {
  const [featured, ...rest] = bodyTypes
  return (
    <section aria-labelledby="body-types-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="body-types-title"
          index="02"
          eyebrow="Browse by body type"
          title="Start with the shape of your life."
          description="A sedan for the daily Gulshan–Motijheel run, a microbus for the whole family to Cox's Bazar. Pick a shape; we'll show what's out there."
        />

        {/* 2×2 feature + five tiles: fills a 3-column grid exactly; on two columns the
            last tile spans the row. */}
        <Stagger className="mt-12 grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[220px] sm:gap-4 lg:grid-cols-3 lg:auto-rows-[230px]">
          <StaggerItem className="col-span-2 row-span-2">
            <BodyTypeTile type={featured} featured />
          </StaggerItem>
          {rest.map((type, i) => (
            <StaggerItem
              key={type.slug}
              className={cn(i === rest.length - 1 && "col-span-2 lg:col-span-1")}
            >
              <BodyTypeTile type={type} />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
