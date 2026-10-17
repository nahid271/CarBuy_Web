"use client"

import { ReactLenis } from "lenis/react"
import { MotionConfig, useReducedMotion } from "motion/react"

import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()

  return (
    <MotionConfig reducedMotion="user">
      {!reduceMotion && <ReactLenis root />}
      <TooltipProvider>{children}</TooltipProvider>
    </MotionConfig>
  )
}
