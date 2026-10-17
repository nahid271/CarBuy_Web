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
    title: "Papers verified",
    body: "Registration, tax token, fitness and insurance matched against BRTA records, and the seller's NID matched against the papers.",
  },
  {
    icon: ClipboardCheckIcon,
    title: "150-point inspection",
    body: "Engine, gearbox, hybrid battery health, chassis and flood checks by CarBuy engineers. The full report sits on every listing.",
  },
  {
    icon: StoreIcon,
    title: "Verified showrooms",
    body: "Trade licence, address and track record checked in person. Showrooms that mislead buyers lose their badge.",
  },
  {
    icon: ScaleIcon,
    title: "Fair price guide",
    body: "Every asking price is compared with recent sales of the same model, year and grade, so you know where it sits.",
  },
  {
    icon: LandmarkIcon,
    title: "Financing, pre-approved",
    body: "Car loans from partner banks, an indicative EMI on every listing, and approval in as little as three working days.",
  },
  {
    icon: KeyRoundIcon,
    title: "Ownership transfer handled",
    body: "We walk you through the BRTA name transfer and hold the payment until the keys change hands.",
  },
]

const stats: { value: number; decimals?: number; suffix?: string; label: string }[] = [
  { value: 12480, label: "Cars listed right now" },
  { value: 640, label: "Verified showrooms" },
  { value: 150, label: "Inspection points per car" },
  { value: 4.8, decimals: 1, suffix: "/5", label: "Average buyer rating" },
]

export function WhyCarBuy() {
  return (
    <section id="why" aria-labelledby="why-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          id="why-title"
          index="04"
          eyebrow="Why CarBuy"
          title="We check the car, so you can choose it."
          description="Buying a used car shouldn't mean taking a stranger's word for the papers. This is what happens before a listing earns its Verified badge."
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
