import { markets } from "./markets.ts"

export type BangladeshLanguage = "bn" | "en"

export function preferredBangladeshLanguage(saved: string | null, deviceLanguage: string | undefined): BangladeshLanguage {
  const available = markets.BD.languages
  if (saved && available.includes(saved)) return saved as BangladeshLanguage
  const device = deviceLanguage?.split("-")[0].toLowerCase()
  return device === "bn" ? "bn" : "en"
}
