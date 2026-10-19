import Link from "next/link"
import { ArrowUpRightIcon, MessageCircleIcon, PhoneIcon } from "lucide-react"

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
      { label: "Showrooms", href: "/showrooms" },
    ],
  },
  {
    title: "Sell",
    links: [
      { label: "Sell your car", href: "/sell" },
      { label: "Free valuation", href: "/sell#valuation" },
      { label: "For showrooms", href: "/dealers" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Financing", href: "/financing" },
      { label: "Inspection report", href: "/inspection" },
      { label: "Ownership transfer", href: "/help/transfer" },
      { label: "Safety tips", href: "/help/safety" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
  },
]

const social = ["Facebook", "Instagram", "YouTube", "LinkedIn"]

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
              Our advisors are on call 10am – 10pm, seven days a week, in English and বাংলা.
            </p>
          </div>
          {/* No real hotline or WhatsApp number exists yet, so both go to /contact. */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact?via=call"
              prefetch={false}
              className={cn(buttonVariants(), "h-12 gap-2 rounded-full px-6 text-[0.95rem]")}
            >
              <PhoneIcon />
              Call an advisor
            </Link>
            <Link
              href="/contact?via=whatsapp"
              prefetch={false}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 gap-2 rounded-full px-6 text-[0.95rem]"
              )}
            >
              <MessageCircleIcon />
              WhatsApp
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="max-w-xs leading-relaxed text-muted-foreground">
              CarBuy is Bangladesh&apos;s marketplace for verified used and reconditioned
              cars. Every listing papers-checked, every showroom visited.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">
              Tejgaon, Dhaka · Agrabad, Chattogram · Zindabazar, Sylhet
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
          <p>© 2026 CarBuy. Made in Dhaka.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {social.map((name) => (
              <li key={name}>
                <a href="#" className="inline-flex items-center gap-1 hover:text-foreground">
                  {name}
                  <ArrowUpRightIcon className="size-3" />
                </a>
              </li>
            ))}
          </ul>
          <p className="flex gap-3">
            <span className="text-foreground">English</span>
            <span aria-hidden>/</span>
            <a href="#" lang="bn" className="hover:text-foreground">
              বাংলা
            </a>
          </p>
        </Container>
      </div>
    </footer>
  )
}
