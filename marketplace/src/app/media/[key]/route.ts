import { publicImage } from "@/lib/carbuy-api"

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params
  const image = await publicImage(key)
  if (!image) return new Response("Not found", { status: 404 })
  return new Response(image.bytes, { headers: { "content-type": image.type, "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" } })
}
