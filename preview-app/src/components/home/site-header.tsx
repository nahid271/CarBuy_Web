"use client"

import { useState } from "react"
import Link from "next/link"
import { useMotionValueEvent, useScroll } from "motion/react"
import { ArrowUpRightIcon, MenuIcon } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/language-client"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { Container } from "./section"

const nav = [
  { href: "/cars", en: "Buy", bn: "গাড়ি কিনুন" },
  { href: "/studio", en: "Try demo", bn: "ডেমো দেখুন" },
  { href: "/sell-your-car", en: "Sell", bn: "গাড়ি বিক্রি" },
  { href: "/dealer-sign-up", en: "Dealers", bn: "ডিলার" },
  { href: "/pricing", en: "Pricing", bn: "মূল্য" },
  { href: "/safety", en: "Safety", bn: "নিরাপত্তা" },
]

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2 rounded-md", className)}
      aria-label="CarBuy home"
    >
      <span className="text-[1.2rem] leading-none font-semibold tracking-[-0.04em]">
        CarBuy
      </span>
      <span className="rounded-full border px-1.5 py-0.5 font-mono text-[0.6rem] leading-none tracking-widest text-muted-foreground transition-colors group-hover:border-foreground group-hover:text-foreground">
        BD
      </span>
    </Link>
  )
}

export function SiteHeader() {
  const language = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8))

  return (
    <header
      className={cn(
        // Opaque on purpose: blurring the oversized black type behind it reads as smudges.
        "sticky top-0 z-40 border-b bg-background transition-[border-color] duration-300",
        scrolled ? "border-border" : "border-transparent"
      )}
    >
      <Container className="flex h-16 items-center gap-8">
        <Wordmark />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item[language]}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/sell-your-car"
            prefetch={false}
            className={cn(buttonVariants(), "hidden h-9 rounded-full px-4 sm:inline-flex")}
          >
            {language === "bn" ? "গাড়ি বিক্রি করুন" : "Sell your car"}
          </Link>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="rounded-full lg:hidden" />
              }
            >
              <MenuIcon />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
              <SheetHeader className="border-b px-6 py-5">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
                <Wordmark />
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col px-6 py-4">
                {nav.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-center justify-between border-b py-5 text-3xl font-semibold tracking-[-0.03em]"
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="font-mono text-xs font-normal tracking-widest text-muted-foreground">
                        0{i + 1}
                      </span>
                      {item[language]}
                    </span>
                    <ArrowUpRightIcon className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
                  </Link>
                ))}
              </nav>
              <SheetFooter className="gap-3 px-6 pb-8">
                <Link
                  href="/sell-your-car"
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                  className={cn(buttonVariants(), "h-12 rounded-full text-base")}
                >
                  {language === "bn" ? "গাড়ি বিক্রি করুন" : "Sell your car"}
                </Link>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}
