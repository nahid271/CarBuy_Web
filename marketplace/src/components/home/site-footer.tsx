import Link from "next/link"
import { BookOpenIcon, ShieldCheckIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Reveal } from "./reveal"
import { Container } from "./section"

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Buy",
    links: [
      { label: "All cars", href: "/cars" },
      { label: "Reconditioned", href: "/cars?condition=reconditioned" },
      { label: "Used", href: "/cars?condition=used" },
      { label: "Hybrids", href: "/cars?fuel=hybrid" },
      { label: "Dealer guide", href: "/dealer-sign-up" },
    ],
  },
  {
    title: "Sell",
    links: [
      { label: "Sell your car", href: "/sell-your-car" },
      { label: "How it works", href: "/how-it-works" },
      { label: "For showrooms", href: "/dealer-sign-up" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Auction sheets", href: "/auction-sheets" },
      { label: "Ownership transfer", href: "/safety" },
      { label: "Safety tips", href: "/safety" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Listing rules", href: "/listing-rules" },
      { label: "Privacy draft", href: "/privacy" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t">
      <Container>
        {/* Contact strip */}
        <Reveal className="flex flex-col gap-6 border-b py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Not sure which car is right?
            </p>
            <p className="mt-2 text-muted-foreground">
              Use the buying guide and compare each car’s documents before you contact a seller.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/safety"
              prefetch={false}
              className={cn(buttonVariants(), "h-12 gap-2 rounded-full px-6 text-[0.95rem]")}
            >
              <ShieldCheckIcon />
              Buying safety
            </Link>
            <Link
              href="/help"
              prefetch={false}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 gap-2 rounded-full px-6 text-[0.95rem]"
              )}
            >
              <BookOpenIcon />
              Help centre
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="max-w-xs leading-relaxed text-muted-foreground">
              CarBuy is a Bangladesh-focused marketplace preview. Cars, sellers and check badges shown here are sample data.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">
              Inspect the vehicle and original documents yourself before paying anyone.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:col-span-2 sm:grid-cols-4 lg:col-span-8">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        className="transition-colors hover:text-muted-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </Container>

      {/* Oversized wordmark: sized to the viewport so it spans edge to edge. */}
      <div aria-hidden className="overflow-hidden select-none">
        <p className="-mb-[0.18em] text-center text-[25vw] leading-[0.85] font-semibold tracking-[-0.07em] text-foreground/[0.06]">
          CarBuy
        </p>
      </div>

      <div className="border-t">
        <Container className="flex flex-col gap-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 CarBuy · Product preview</p>
          <p>Bangla and English guidance is being integrated into this storefront.</p>
        </Container>
      </div>
    </footer>
  )
}
