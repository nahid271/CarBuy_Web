"use client"

import { setLanguage, useLanguage } from "@/lib/language-client"

export function LanguageToggle({ className = "" }: { className?: string }) {
  const language = useLanguage()
  const next = language === "bn" ? "en" : "bn"
  return <button type="button" lang={next} onClick={() => setLanguage(next)}
    aria-label={language === "bn" ? "ইংরেজিতে দেখুন" : "Switch to Bangla"}
    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted ${className}`}>
    {language === "bn" ? "English" : "বাংলা"}
  </button>
}
