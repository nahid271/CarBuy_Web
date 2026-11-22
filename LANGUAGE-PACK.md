# CarBuy English–Bangla language pack

The public black-themed preview and local Next.js storefront share the same Bangladesh-facing UI dictionary in [`shared/ui-translations.ts`](shared/ui-translations.ts). It covers navigation, homepage sections, search and car-detail labels, dealer/seller/buyer demo actions, moderation, alerts, planning, safety notices, validation messages and accessibility labels.

Use the **বাংলা / English** control in the header to switch in either direction. The preference is saved in this browser. A `?lang=bn` or `?lang=en` query parameter also selects a language for a shared link; switching from that link updates its parameter. Bangla-locale devices default to Bangla when there is no saved choice.

The language surface translates fixed interface text and common dynamic notices after hydration, including text added by interactive components. It leaves input values, URLs and identifiers unchanged. Bengali digits and common units appear in display text. User-written vehicle descriptions, chat messages and seller names are not machine translated; vehicle brand and model names retain their official spelling. Existing long-form guide and pricing content uses its own bilingual source text.

The public GitHub Pages export still has one set of prerendered English HTML and metadata. The Bangla switch is client-side, so localized search-engine pages and server-side Bangla metadata remain future SEO work. This pack does not change the prototype's lack of real authentication, data hosting or payments.
