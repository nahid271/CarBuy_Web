import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"

import { formatCount } from "@/lib/format"
import { makeCounts } from "@/lib/mock-listings"
import { cn } from "@/lib/utils"

import { Stagger, StaggerItem } from "./reveal"
import { Container, SectionHeading } from "./section"

// Typographic marks rather than manufacturer logos: consistent, monochrome, and
// nothing to license. Long names get tighter tracking so every mark fits its cell.
function MakeMark({ name }: { name: string }) {
  return (
    <span
      className={cn(
        "text-base font-semibold uppercase sm:text-lg",
        name.length > 9 ? "tracking-[0.06em]" : "tracking-[0.22em]"
      )}
    >
      {name}
    </span>
  )
}

export function Makes() {
  return (
    <section aria-labelledby="makes-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="makes-title"
          index="03"
          eyebrow="Browse by make"
          title="Every badge Bangladesh drives."
          description="From the Toyotas that fill Dhaka's roads to the German saloons in Gulshan — sorted, counted and verified."
          action={
            <Link
              href="/cars"
              prefetch={false}
              className="group inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
            >
              All 40+ makes
              <ArrowUpRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          }
        />

        <Stagger
          gap={0.04}
          className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] border bg-border sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        >
          {/* Cells stay opaque (they draw the hairline grid); only their contents fade in. */}
          {makeCounts.map((make) => (
            <Link
              key={make.name}
              href={`/cars?make=${encodeURIComponent(make.name)}`}
              prefetch={false}
              className="group flex h-36 bg-background p-5 transition-colors duration-300 hover:bg-foreground hover:text-background focus-visible:bg-foreground focus-visible:text-background sm:h-40"
            >
              <StaggerItem className="flex flex-1 flex-col justify-between">
                <MakeMark name={make.name} />
                <span className="flex items-center justify-between text-xs text-muted-foreground transition-colors duration-300 group-hover:text-background/70 group-focus-visible:text-background/70">
                  <span>
                    <span className="font-mono tabular-nums">{formatCount(make.count)}</span> listings
                  </span>
                  <ArrowUpRightIcon className="size-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
              </StaggerItem>
            </Link>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
