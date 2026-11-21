import { cn } from "@/lib/utils"

import { Reveal } from "./reveal"

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10", className)}
      {...props}
    />
  )
}

/** Small mono label used above section titles: "01 — Featured". */
export function Eyebrow({
  index,
  children,
  className,
}: {
  index?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase",
        className
      )}
    >
      {index && <span className="text-foreground">{index}</span>}
      {index && <span aria-hidden className="h-px w-8 bg-border" />}
      <span>{children}</span>
    </p>
  )
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  action,
  id,
}: {
  index: string
  eyebrow: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  id?: string
}) {
  return (
    <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <Eyebrow index={index}>{eyebrow}</Eyebrow>
        <h2
          id={id}
          className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  )
}
