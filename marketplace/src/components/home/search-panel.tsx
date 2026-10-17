"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { budgets, cities, makes, modelsByMake, years } from "@/lib/mock-listings"
import { cn } from "@/lib/utils"

const conditions = [
  { value: "all", label: "All cars" },
  { value: "reconditioned", label: "Reconditioned" },
  { value: "used", label: "Used" },
] as const

const popular = ["Axio", "Premio", "Noah", "Vezel", "Corolla Cross", "X-Trail"]

type Option = { value: string; label: string }

function SearchField({
  label,
  name,
  placeholder,
  options,
  value,
  onValueChange,
  disabled,
  className,
}: {
  label: string
  name: string
  placeholder: string
  options: Option[]
  value?: string | null
  onValueChange?: (value: string | null) => void
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn("group/field relative bg-background transition-colors", className)}>
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-3.5 left-4 font-mono text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase"
      >
        {label}
      </label>
      <Select
        name={name}
        items={options}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="h-full w-full rounded-none border-0 bg-transparent px-4 pt-9 pb-3.5 text-[0.95rem] font-medium hover:bg-muted/60 focus-visible:ring-0 focus-visible:bg-muted/60 data-[size=default]:h-full dark:bg-transparent dark:hover:bg-muted/40"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="max-h-72">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="py-2 pl-2.5">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function SearchPanel({ className }: { className?: string }) {
  const [condition, setCondition] = useState<(typeof conditions)[number]["value"]>("all")
  const [make, setMake] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)

  const makeOptions = makes.map((m) => ({ value: m, label: m }))
  const modelOptions = (make ? modelsByMake[make] : []).map((m) => ({ value: m, label: m }))

  return (
    <div className={className}>
      <form
        action="/cars"
        method="get"
        role="search"
        aria-label="Search cars"
        className="rounded-[1.75rem] border bg-background/95 p-2.5 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.45)] backdrop-blur-xl sm:p-3 dark:shadow-[0_40px_100px_-40px_rgb(0_0_0/0.9)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-1.5 pt-1 pb-3">
          <div role="radiogroup" aria-label="Condition" className="flex rounded-full bg-muted p-1">
            {conditions.map((c) => {
              const active = condition === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCondition(c.value)}
                  className={cn(
                    "relative rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors sm:px-4",
                    active ? "text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="condition-pill"
                      className="absolute inset-0 rounded-full bg-foreground"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                    />
                  )}
                  <span className="relative">{c.label}</span>
                </button>
              )
            })}
          </div>
          <input type="hidden" name="condition" value={condition} />
          <p className="hidden font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase sm:block">
            Every listing papers-checked
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[1.25rem] border bg-border sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
          <SearchField
            label="Make"
            name="make"
            placeholder="Any make"
            options={makeOptions}
            value={make}
            onValueChange={(next) => {
              setMake(next)
              setModel(null)
            }}
          />
          <SearchField
            label="Model"
            name="model"
            placeholder={make ? "Any model" : "Choose a make first"}
            options={modelOptions}
            value={model}
            onValueChange={setModel}
            disabled={!make}
          />
          <SearchField label="Budget" name="budget" placeholder="Any budget" options={budgets} />
          <SearchField label="Year" name="year" placeholder="Any year" options={years} />
          <SearchField
            label="Location"
            name="city"
            placeholder="All Bangladesh"
            options={cities.map((c) => ({ value: c, label: c }))}
            className="sm:col-span-2 lg:col-span-1"
          />
          <div className="bg-background p-1.5 sm:col-span-2 lg:col-span-1">
            <Button
              type="submit"
              className="h-14 w-full gap-2 rounded-[0.9rem] px-7 text-[0.95rem] lg:h-full"
            >
              <SearchIcon className="size-4.5" />
              Search
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 px-1 text-sm">
        <span className="mr-1 font-mono text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
          Popular
        </span>
        {popular.map((model) => (
          <Link
            key={model}
            href={`/cars?q=${encodeURIComponent(model)}`}
            prefetch={false}
            className="rounded-full border px-3 py-1 text-[0.8rem] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            {model}
          </Link>
        ))}
      </div>
    </div>
  )
}
