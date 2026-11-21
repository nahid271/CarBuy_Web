"use client"

import { useEffect, useRef } from "react"
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react"

const grouped = new Intl.NumberFormat("en-IN")

function formatNumber(n: number, decimals: number) {
  return decimals > 0 ? n.toFixed(decimals) : grouped.format(Math.round(n))
}

/**
 * Counts up to `value` the first time it scrolls into view. The final value is
 * server-rendered, so it reads correctly without JavaScript and with reduced
 * motion; with motion allowed it resets to zero after hydration, while still
 * off-screen, and counts up on arrival.
 */
export function Counter({
  value,
  decimals = 0,
  className,
}: {
  value: number
  decimals?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduceMotion = useReducedMotion()
  const count = useMotionValue(value)
  const display = useTransform(count, (n) => formatNumber(n, decimals))

  useEffect(() => {
    if (reduceMotion) return
    if (!inView) {
      count.set(0)
      return
    }
    const controls = animate(count, value, { duration: 1.8, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [count, inView, reduceMotion, value])

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  )
}
