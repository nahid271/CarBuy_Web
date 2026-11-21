"use client"

import { useEffect, useSyncExternalStore } from "react"
import { preferredBangladeshLanguage, type BangladeshLanguage } from "../../../shared/language"
import { trackLocalEvent } from "@/lib/analytics-client"

const key = "carbuy.language.v1"
const eventName = "carbuy:language-changed"
let ephemeral: BangladeshLanguage | null = null

function currentLanguage(): BangladeshLanguage {
  let saved: string | null = null
  try { saved = window.localStorage.getItem(key) } catch { /* Storage can be disabled. */ }
  return preferredBangladeshLanguage(saved || ephemeral, window.navigator.languages?.[0] || window.navigator.language)
}

function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback)
  window.addEventListener("storage", callback)
  return () => { window.removeEventListener(eventName, callback); window.removeEventListener("storage", callback) }
}

export function useLanguage(): BangladeshLanguage {
  const language = useSyncExternalStore(subscribe, currentLanguage, () => "en" as const)
  useEffect(() => { document.documentElement.lang = language }, [language])
  return language
}

export function setLanguage(next: BangladeshLanguage) {
  const previous = currentLanguage()
  if (previous === next) return
  ephemeral = next
  try { window.localStorage.setItem(key, next) } catch { /* This tab still switches. */ }
  document.documentElement.lang = next
  window.dispatchEvent(new Event(eventName))
  trackLocalEvent("language_switched", { from: previous, to: next })
}
