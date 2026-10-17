import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { estimateEmi, formatLakh, formatTaka } from "@/lib/format"
import { unsplash } from "@/lib/mock-listings"
import { cn } from "@/lib/utils"

import { Reveal } from "./reveal"
import { Container } from "./section"

const steps = [
  { title: "Book a free inspection", body: "At your home or a CarBuy hub in Dhaka, Chattogram or Sylhet." },
  { title: "Get offers in 24 hours", body: "Verified showrooms bid on your car; you see every offer." },
  { title: "Accept and get paid", body: "We handle the BRTA transfer. Money lands before the keys leave." },
]

// Worked example for the financing panel.
const example = { price: 3_390_000, label: "2019 Toyota Premio" }
const down = example.price * 0.2

export function SellBand() {
  const emi = Math.round(estimateEmi(example.price) / 100) * 100

  return (
    <section id="sell" aria-labelledby="sell-title" className="py-16 sm:py-20 lg:py-24">
      <Container className="grid gap-4 lg:grid-cols-12">
        <Reveal className="relative flex flex-col overflow-hidden rounded-[2rem] bg-foreground text-background lg:col-span-8 lg:min-h-[600px]">
          <div className="relative h-60 sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[62%]">
            <Image
              src={unsplash("photo-1623869675781-80aa31012a5a")}
              alt="White Toyota sedan parked on a seafront road"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover [mask-image:linear-gradient(to_bottom,black_45%,transparent)] lg:[mask-image:linear-gradient(to_left,black_40%,transparent)]"
            />
          </div>

          <div className="relative flex flex-1 flex-col p-7 sm:p-10 lg:max-w-[58%] lg:p-12">
            <p className="flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.18em] text-background/60 uppercase">
              <span className="text-background">06</span>
              <span aria-hidden className="h-px w-8 bg-background/25" />
              Sell your car
            </p>
            <h2
              id="sell-title"
              className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl"
            >
              Sell it this weekend. Get paid on Monday.
            </h2>

            <ol className="mt-10 grid gap-6 lg:mt-auto lg:pt-10">
              {steps.map((step, i) => (
                <li key={step.title} className="flex gap-5 border-t border-background/15 pt-5">
                  <span className="font-mono text-xs text-background/50">0{i + 1}</span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm text-background/65">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/sell"
                prefetch={false}
                className={cn(
                  buttonVariants(),
                  "group h-12 gap-2 rounded-full bg-background px-6 text-[0.95rem] text-foreground hover:bg-background/85"
                )}
              >
                Get a free valuation
                <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="text-sm text-background/60">No fees. No obligation.</p>
            </div>
          </div>
        </Reveal>

        <Reveal
          delay={0.1}
          id="financing"
          className="flex flex-col rounded-[2rem] border p-7 sm:p-10 lg:col-span-4"
        >
          <p className="flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
            <span className="text-foreground">07</span>
            <span aria-hidden className="h-px w-8 bg-border" />
            Financing
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
            Drive now. Pay monthly.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Car loans from partner banks, with an indicative EMI on every listing.
          </p>

          <div className="mt-10 lg:mt-auto">
            <p className="font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              {example.label} · ৳ {formatLakh(example.price)}
            </p>
            <p className="mt-2 text-5xl font-semibold tracking-[-0.05em] tabular-nums">
              {formatTaka(emi)}
              <span className="text-xl tracking-tight text-muted-foreground">/mo</span>
            </p>
            <dl className="mt-6 divide-y border-y text-sm">
              {[
                ["Down payment (20%)", formatTaka(down)],
                ["Loan amount", formatTaka(example.price - down)],
                ["Tenure", "60 months"],
                ["Indicative rate", "10% p.a."],
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between py-2.5">
                  <dt className="text-muted-foreground">{term}</dt>
                  <dd className="font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/financing"
              prefetch={false}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-6 h-12 w-full rounded-full text-[0.95rem]"
              )}
            >
              Check your eligibility
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Illustrative only; the partner bank sets the final rate.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
