"use client"

import { motion, type Variants } from "motion/react"

// Shared scroll-reveal primitives. MotionConfig reducedMotion="user" (providers.tsx)
// drops the transform for people who ask for less motion; the fade remains.

export const easeOut = [0.22, 1, 0.36, 1] as const

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
}

type MotionDivProps = React.ComponentProps<typeof motion.div>

/** Fades and lifts its children once, the first time they scroll into view. */
export function Reveal({ delay = 0, ...props }: MotionDivProps & { delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: revealItem.hidden,
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut, delay } },
      }}
      {...props}
    />
  )
}

/** Reveals each direct <StaggerItem> child in turn. */
export function Stagger({ gap = 0.08, ...props }: MotionDivProps & { gap?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      {...props}
    />
  )
}

export function StaggerItem(props: MotionDivProps) {
  return <motion.div variants={revealItem} {...props} />
}
