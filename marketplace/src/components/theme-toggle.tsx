"use client"

import { useSyncExternalStore } from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The initial class comes from themeScript (src/lib/theme.ts) in the root layout.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

const isDark = () => document.documentElement.classList.contains("dark")

export function ThemeToggle({ className }: { className?: string }) {
  // The server can't know the theme; render the light-mode label until hydrated.
  const dark = useSyncExternalStore(subscribe, isDark, () => false)

  function toggle() {
    const next = !isDark()
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {}
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn("rounded-full", className)}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
