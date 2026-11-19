import "server-only"

export type CarCard = {
  id: string; title: string; year: number; priceBdt: number; priceLakh: number;
  condition: string; mileageKm: number; fuel: string; area: string; district: string;
  coverKey?: string; papersChecked: boolean; auctionVerified: boolean; verifiedDealer: boolean;
  sellerType: "private" | "dealer"; placement?: "top" | "featured";
}
export type SearchResult = { total: number; page: number; totalPages: number; cards: CarCard[];
  facets: Record<string, { id: string; label: string; count: number }[]> }
export type CarDetail = {
  id: string; title: string; availability: string; priceBdt: number; priceLakh: number;
  condition: string; mileageKm: number; engineCc: number; fuel: string; manufactureYear: number;
  registrationYear: number | null; area: string; district: string; transmission: string; body: string;
  photos: { webpKey: string }[]; description: { text: string }; trust: {
    papersChecked: boolean; auctionStatus: string; auctionGrade: string | null; chassisMasked: string;
    taxTokenExpiry: string | null; fitnessExpiry: string | null
  }; seller: { type: string; name: string; verified?: boolean; phoneVerified?: boolean; address?: string };
  similar: CarCard[]
}
const origin = (process.env.CARBUY_API_URL ?? "http://127.0.0.1:4175").replace(/\/$/, "")
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${origin}${path}`, { cache: "no-store" })
  if (!response.ok) throw new Error(`CarBuy API returned ${response.status}`)
  return response.json() as Promise<T>
}
export async function homeData() {
  return get<{ total: number; newListings: CarCard[]; popularModels: { id: string; label: string; count: number }[];
    budgets: { maxLakh: number; count: number }[] }>("/api/home")
}
export async function searchCars(params: URLSearchParams) { return get<SearchResult>(`/api/search?${params}`) }
export async function carDetail(id: string) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) return null
  const response = await fetch(`${origin}/api/detail/${id}`, { cache: "no-store" })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`CarBuy API returned ${response.status}`)
  const result = await response.json() as { kind: "detail"; detail: CarDetail } | { kind: "redirect" }
  return result.kind === "detail" ? result.detail : null
}
export async function publicImage(key: string) {
  if (!/^[a-zA-Z0-9-]+\.(svg|webp|avif)$/.test(key)) return null
  const response = await fetch(`${origin}/media/public/${key}`, { cache: "force-cache" })
  if (!response.ok) return null
  return { bytes: await response.arrayBuffer(), type: response.headers.get("content-type") ?? "image/webp" }
}
