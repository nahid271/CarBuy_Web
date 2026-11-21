import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

import { Reveal, Stagger, StaggerItem } from "./reveal"
import { Container, Eyebrow } from "./section"

const featured = {
  quote:
    "Does the chassis number on the car match the registration certificate, the seller’s documents, and the listing? Check all three before agreeing to pay.",
  name: "CarBuy safety guide",
  detail: "Question 01 · Vehicle identity",
}

const others = [
  {
    quote: "For an imported car, ask to see the auction sheet and check its grade and mileage against the listing. A seller-uploaded image is not an independent verification.",
    name: "Auction sheet",
    detail: "Question 02 · Vehicle history",
  },
  {
    quote: "Is the asking price unusually low compared with similar cars? Visit, inspect and confirm the documents before sending any booking money.",
    name: "Price and payment",
    detail: "Question 03 · Scam prevention",
  },
  {
    quote: "Who will complete the BRTA ownership transfer, and when? Check the current official forms, fees and responsibilities before exchanging keys and payment.",
    name: "Ownership transfer",
    detail: "Question 04 · After the sale",
  },
]

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

export function Testimonials() {
  return (
    <section aria-labelledby="testimonials-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <Reveal>
          <Eyebrow index="05">Buyer checklist</Eyebrow>
          <h2 id="testimonials-title" className="sr-only">
            Questions worth asking
          </h2>
        </Reveal>

        <Reveal delay={0.05} className="mt-8 grid gap-10 lg:grid-cols-12">
          <figure className="lg:col-span-10">
            <blockquote className="text-3xl leading-[1.15] font-medium tracking-[-0.03em] text-balance sm:text-4xl lg:text-5xl">
              <span aria-hidden className="text-muted-foreground">
                “
              </span>
              {featured.quote}
              <span aria-hidden className="text-muted-foreground">
                ”
              </span>
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-4">
              <Avatar size="lg">
                <AvatarFallback className="bg-foreground text-background">
                  {initials(featured.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{featured.name}</p>
                <p className="text-sm text-muted-foreground">{featured.detail}</p>
              </div>
            </figcaption>
          </figure>
        </Reveal>

        <Stagger className="mt-16 grid border-t sm:mt-20 md:grid-cols-3">
          {others.map((t, i) => (
            <StaggerItem
              key={t.name}
              className={cn(
                "border-b py-8 md:border-b-0 md:px-8",
                i === 0 ? "md:pl-0" : "md:border-l",
                i === others.length - 1 && "md:pr-0"
              )}
            >
              <figure className="flex h-full flex-col">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t.name}</p>
                <blockquote className="mt-5 flex-1 leading-relaxed text-pretty">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="text-xs">{initials(t.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.detail}</p>
                  </div>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}
