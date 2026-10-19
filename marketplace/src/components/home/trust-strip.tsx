const points = [
  "BRTA papers verified",
  "150-point inspection",
  "640 verified showrooms",
  "Hybrid battery health report",
  "EMI from partner banks",
  "Ownership transfer handled",
]

/** Slow ticker of what "Verified" means. Static for reduced-motion users. */
export function TrustStrip() {
  // Two identical runs so the -50% translate loops seamlessly.
  const run = [...points, ...points]
  return (
    <section aria-label="What every listing includes" className="overflow-hidden border-y py-5">
      <ul className="flex w-max animate-marquee gap-10 pr-10 motion-reduce:animate-none">
        {run.map((point, i) => (
          <li
            key={i}
            aria-hidden={i >= points.length}
            className="flex items-center gap-10 text-sm whitespace-nowrap text-muted-foreground"
          >
            <span>{point}</span>
            <span aria-hidden className="size-1 rounded-full bg-foreground/40" />
          </li>
        ))}
      </ul>
    </section>
  )
}
