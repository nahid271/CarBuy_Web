import assert from "node:assert/strict"
import test from "node:test"
import { banglaUi, localizeDigits, translateUiText } from "../../shared/ui-translations.ts"

test("shared UI pack covers the marketplace and preserves English source copy", () => {
  assert.ok(Object.keys(banglaUi).length >= 500)
  assert.equal(translateUiText("Find your car.", "bn"), "আপনার গাড়ি খুঁজুন।")
  assert.equal(translateUiText("Find your car.", "en"), "Find your car.")
  assert.equal(translateUiText("  11 cars  ", "bn"), "  ১১টি গাড়ি  ")
  assert.equal(translateUiText("৳24.8 lakh", "bn"), "৳২৪.৮ লাখ")
  assert.equal(
    translateUiText("11 sample cars match these filters. This is a small illustrative set, not live inventory.", "bn"),
    "১১টি নমুনা গাড়ি এই ফিল্টারে মিলেছে। এটি ছোট উদাহরণ, চালু গাড়ির তালিকা নয়।",
  )
  assert.equal(
    translateUiText("0 local photos selected. JPG, PNG or WebP only.", "bn"),
    "০টি স্থানীয় ছবি বাছা হয়েছে। শুধু JPG, PNG বা WebP।",
  )
  assert.equal(localizeDigits("2026", "bn"), "২০২৬")
  assert.equal(translateUiText("A15 G", "bn"), "A15 G")
})

test("dynamic seller and moderation notices have Bangla templates", () => {
  assert.equal(
    translateUiText("2019 Honda Vezel is awaiting review", "bn"),
    "২০১৯ Honda Vezel পর্যালোচনার অপেক্ষায় আছে",
  )
  assert.equal(
    translateUiText("New demo report about 2019 Toyota Premio", "bn"),
    "২০১৯ Toyota Premio সম্পর্কে নতুন ডেমো রিপোর্ট",
  )
})
