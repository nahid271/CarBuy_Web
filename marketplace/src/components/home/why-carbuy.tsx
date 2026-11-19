import {
  ClipboardCheckIcon,
  FileCheck2Icon,
  KeyRoundIcon,
  LandmarkIcon,
  ScaleIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import { Counter } from "./counter"
import { Reveal, Stagger, StaggerItem } from "./reveal"
import { Container, SectionHeading } from "./section"

const pillars: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FileCheck2Icon,
    title: "Papers comparison",
    body: "The review workflow compares uploaded chassis and registration details with the listing and flags owner-name mismatches for a human decision.",
  },
  {
    icon: ClipboardCheckIcon,
    title: "Suspicious listing signals",
    body: "Moderators can see duplicate chassis or photos, unusual prices, contact details in descriptions and sudden posting activity.",
  },
  {
    icon: StoreIcon,
    title: "Dealer review",
    body: "A dealer application records trade-licence details and supports a manual visit or video check before a badge is approved.",
  },
  {
    icon: ScaleIcon,
    title: "Price context",
    body: "Compare asking prices for a model, year and location. The prototype does not claim to know a final sale price.",
  },
  {
    icon: LandmarkIcon,
    title: "Buyer privacy",
    body: "Contact details stay out of public listing data. The demo requires a verified buyer identity before a contact reveal.",
  },
  {
    icon: KeyRoundIcon,
    title: "Transfer guidance",
    body: "Read the ownership-transfer steps and check current forms and fees on the official BRTA portal before paying.",
  },
]

const stats: { value: number; decimals?: number; suffix?: string; label: string }[] = [
  { value: 48, label: "Sample cars in this preview" },
  { value: 11, label: "Bangla and English guides" },
  { value: 2, label: "Languages in the content set" },
  { value: 7, label: "Listing review signals" },
]

export function WhyCarBuy() {
  return (
    <section id="why" aria-labelledby="why-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="why-title"
          index="04"
          eyebrow="Why CarBuy"
          title="Know what to check before you drive."
          description="These prototype workflows help surface details worth reviewing. A demo badge is never a substitute for inspecting the car and original documents yourself."
        />

        <Stagger
          gap={0.06}
          className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] border bg-border sm:grid-cols-2 lg:grid-cols-3"
        >
          {/* Cells stay opaque (they draw the hairline grid); only their contents fade in. */}
          {pillars.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="group bg-background p-7 sm:p-9">
              <StaggerItem>
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-full border transition-colors duration-300 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                    <Icon className="size-5" strokeWidth={1.6} />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-10 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-3 leading-relaxed text-pretty text-muted-foreground">{body}</p>
              </StaggerItem>
            </div>
          ))}
        </Stagger>

        <Reveal className="mt-4 grid grid-cols-2 overflow-hidden rounded-[1.5rem] bg-foreground text-background lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "border-background/15 p-5 sm:p-9",
                i % 2 === 1 && "border-l",
                i >= 2 && "border-t lg:border-t-0",
                i === 2 && "lg:border-l"
              )}
            >
              <p className="text-4xl font-semibold tracking-[-0.05em] tabular-nums sm:text-6xl xl:text-7xl">
                <Counter value={stat.value} decimals={stat.decimals} />
                {stat.suffix && (
                  <span className="text-xl tracking-tight text-background/50 sm:text-3xl">
                    {stat.suffix}
                  </span>
                )}
              </p>
              <p className="mt-3 text-sm text-background/65">{stat.label}</p>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  )
}
