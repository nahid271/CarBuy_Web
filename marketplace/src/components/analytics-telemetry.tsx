"use client"

import { useEffect } from "react"
import { trackLocalEvent } from "@/lib/analytics-client"

export function SearchTelemetry({ resultCount, filterCount, sort }: { resultCount: number; filterCount: number; sort: string }) {
  useEffect(() => { trackLocalEvent("search_performed", { result_count: resultCount, filter_count: filterCount, sort }) }, [resultCount, filterCount, sort])
  return null
}

export function DetailTelemetry({ listingId }: { listingId: string }) {
  useEffect(() => { trackLocalEvent("vdp_viewed", { listing_id: listingId }) }, [listingId])
  return null
}
