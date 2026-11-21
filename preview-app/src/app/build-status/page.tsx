import type { Metadata } from "next"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { LaunchWorkbench } from "@/components/launch-workbench"

export const metadata: Metadata = {
  title: "Build status | CarBuy preview",
  description: "A browser-local CarBuy launch planning workbench for PRD sections 16–25.",
  robots: { index: false, follow: false },
}

export default function BuildStatusPage() {
  return <><SiteHeader /><LaunchWorkbench /><SiteFooter /></>
}
