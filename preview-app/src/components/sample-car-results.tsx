"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ListingCard } from "@/components/home/listing-card"
import { SearchTelemetry } from "@/components/analytics-telemetry"
import { featuredListings } from "@/lib/mock-listings"

export function SampleCarResults() {
  const params = useSearchParams()
  const cars = useMemo(() => {
    const condition = params.get("condition")?.toLowerCase()
    const make = params.get("make")?.toLowerCase()
    const query = params.get("q")?.trim().toLowerCase()
    const city = params.get("district")?.toLowerCase()
    const fuel = params.get("fuel")?.toLowerCase()
    const min = Number(params.get("priceMin") || 0)
    const max = Number(params.get("priceMax") || 0)
    const year = Number(params.get("yearMin") || 0)
    const sort = params.get("sort") || "best_match"
    const found = featuredListings.filter(car => {
      const text = [car.make, car.model, car.trim, car.city, car.area].join(" ").toLowerCase()
      return (!condition || car.condition.toLowerCase() === condition) &&
        (!make || car.make.toLowerCase() === make) &&
        (!query || text.includes(query)) &&
        (!city || car.city.toLowerCase() === city) &&
        (!fuel || car.fuel.toLowerCase().includes(fuel)) &&
        (!min || car.priceBdt >= min * 100_000) &&
        (!max || car.priceBdt <= max * 100_000) &&
        (!year || car.year >= year)
    })
    if (sort === "price_asc") found.sort((a, b) => a.priceBdt - b.priceBdt)
    if (sort === "price_desc") found.sort((a, b) => b.priceBdt - a.priceBdt)
    if (sort === "newest") found.sort((a, b) => b.year - a.year)
    return found
  }, [params])
  const filterCount = [...params.keys()].filter(key => key !== "sort" && key !== "page").length
  return <>
    <SearchTelemetry resultCount={cars.length} filterCount={filterCount} sort={params.get("sort") || "best_match"} />
    <p className="mt-5 text-sm text-muted-foreground">{cars.length} sample {cars.length === 1 ? "car" : "cars"} match these filters. This is a small illustrative set, not live inventory.</p>
    {cars.length > 0 ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{cars.map(car => <ListingCard key={car.id} listing={car} />)}</div> :
      <div className="mt-10 rounded-2xl border bg-card p-10 text-center"><h2 className="text-xl font-semibold">No sample cars match</h2><p className="mt-2 text-muted-foreground">Try a broader search or clear the filters.</p><Link href="/cars" className="mt-5 inline-block rounded-full border px-5 py-2 text-sm">Clear filters</Link></div>}
  </>
}
