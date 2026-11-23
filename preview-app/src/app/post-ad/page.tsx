import type { Metadata } from "next"
import { SiteHeader } from "@/components/home/site-header"
import { SiteFooter } from "@/components/home/site-footer"
import { PostAdWizard } from "@/components/post-ad-wizard"

export const metadata: Metadata = {
  title: "Post a car ad | CarBuy preview",
  description: "Create a sample car ad as a private seller, reconditioned dealer, used car dealer or brand new car dealer.",
  robots: { index: false, follow: false },
}

export default function PostAdPage() {
  return <><SiteHeader /><PostAdWizard /><SiteFooter /></>
}
