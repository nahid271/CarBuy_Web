import { StarIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

import { Reveal, Stagger, StaggerItem } from "./reveal"
import { Container, Eyebrow } from "./section"

const featured = {
  quote:
    "I'd been burned once by a seller whose papers didn't match the chassis number. With CarBuy the BRTA check was done before I even called — I test-drove the Axio on Saturday and drove it home on Monday.",
  name: "Tahmid Rahman",
  detail: "Bought a 2016 Toyota Axio · Mirpur, Dhaka",
}

const others = [
  {
    quote:
      "The inspection report flagged a tired hybrid battery on the first Vezel I liked. The second one was clean, and the showroom took ৳80,000 off the first anyway.",
    name: "Nusrat Jahan",
    detail: "Bought a 2018 Honda Vezel · Chattogram",
  },
  {
    quote:
      "We needed a Noah for a family of seven. Filtering by Sylhet and seeing real EMIs next to each price saved us weeks of phone calls.",
    name: "Arif Hossain",
    detail: "Bought a 2017 Toyota Noah · Sylhet",
  },
  {
    quote:
      "Sold my Premio in four days. The valuation was within ৳50,000 of the final offer, and they handled the name transfer.",
    name: "Farhana Akter",
    detail: "Sold a 2015 Toyota Premio · Gulshan, Dhaka",
  },
]

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

function Stars() {
  return (
    <span className="flex gap-0.5" aria-label="Rated 5 out of 5">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className="size-3.5 fill-current" aria-hidden />
      ))}
    </span>
  )
}

export function Testimonials() {
  return (
    <section aria-labelledby="testimonials-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <Reveal>
          <Eyebrow index="05">Buyers & sellers</Eyebrow>
          <h2 id="testimonials-title" className="sr-only">
            What buyers and sellers say
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
                <Stars />
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
