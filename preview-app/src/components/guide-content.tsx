"use client"

import Link from "next/link"
import { Container } from "@/components/home/section"
import { contentPages } from "@/lib/content"
import { useLanguage } from "@/lib/language-client"

export function GuideContent({ slug, previewOnly = false }: { slug: string; previewOnly?: boolean }) {
  const language = useLanguage()
  const page = contentPages[slug]
  if (!page) return null
  const index = language === "bn" ? 1 : 0
  return <main className="flex-1"><Container className="max-w-4xl py-12 sm:py-16">
    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">CarBuy · {previewOnly ? "marketplace preview" : "guide"}</p>
    {previewOnly && <p className="mt-6 rounded-2xl border bg-muted/50 p-4 text-sm text-muted-foreground">{language === "bn" ? "এটি নমুনা প্রিভিউ। এখানে আসল অ্যাকাউন্ট, বিক্রেতার যোগাযোগ বা পেমেন্ট চালু নেই।" : "This is a sample preview. Real accounts, seller contact and payments are not active here."}</p>}
    <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{page.title[index]}</h1>
    <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{page.intro[index]}</p>
    <div className="mt-10 space-y-4">{page.sections.map(section => <section key={section.heading[0]} className="rounded-2xl border bg-card p-6 sm:p-7">
      <h2 className="text-2xl font-semibold">{section.heading[index]}</h2>
      <p className="mt-4 leading-relaxed text-muted-foreground">{section.body[index]}</p>
    </section>)}</div>
    {slug === "safety" && <section className="mt-6 rounded-2xl border bg-card p-6 sm:p-7">
      <h2 className="text-2xl font-semibold">{language === "bn" ? "মালিকানা বদলি" : "Ownership transfer"}</h2>
      <p className="mt-4 text-muted-foreground">{language === "bn" ? "হস্তান্তরের আগে সরকারি বিআরটিএ পোর্টালে বর্তমান ফরম, কাগজপত্র ও ফি মিলিয়ে নিন।" : "Check the current forms, documents and fees together on the official BRTA portal before a transfer."}</p>
      <a href="https://bsp.brta.gov.bd/ownershipTransfer" className="mt-3 inline-block underline">{language === "bn" ? "বিআরটিএর নির্দেশনা" : "BRTA guidance"}</a>
    </section>}
    {(slug === "sell-your-car" || slug === "dealer-sign-up") && <Link href="/post-ad" className="mt-8 inline-block rounded-full bg-foreground px-6 py-4 font-semibold text-background">{language === "bn" ? "ইন্টারঅ্যাকটিভ ডেমো খুলুন" : slug === "sell-your-car" ? "Post a sample ad" : "Post a stock ad"}</Link>}
    <div className="mt-10 flex flex-wrap gap-3">
      <Link href="/cars" className="inline-block rounded-full border px-5 py-3">{language === "bn" ? "নমুনা গাড়ি দেখুন" : "Browse sample cars"}</Link>
      <Link href="/pricing" className="inline-block rounded-full border px-5 py-3">{language === "bn" ? "নমুনা মূল্য দেখুন" : "View sample pricing"}</Link>
    </div>
  </Container></main>
}
