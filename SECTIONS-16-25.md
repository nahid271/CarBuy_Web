# CarBuy PRD sections 16–25: implementation and launch register

The supplied PRD ends its MVP functional requirement IDs at **9.15**. This register interprets the requested “9.16–9.25” as the PRD's main **sections 16–25**. It distinguishes code that runs in the black-themed marketplace from operational work that cannot be completed by a code push. The [9.1–9.15 audit](MVP-AUDIT.md) remains the baseline for the actual MVP.

| PRD section | Delivered in this repository | Completion boundary |
| --- | --- | --- |
| 16 Analytics events | `platform/src/analytics.ts` defines the full 24-event vocabulary, consent gate, attribution parser and property allowlist. The black storefront asks for consent, records search/listing/detail/language events locally, supports export/deletion/withdrawal, and shows local counts in `/build-status`. | **Partial.** Browser events are local to a visitor's device; there is no production analytics store, app instrumentation or cross-user funnel dashboard. Other events must be wired at their real transaction boundaries. |
| 17 Architecture & stack | The black-themed Next.js storefront and static preview share pricing, market configuration, language selection and bilingual guidance from `shared/`; the search module now uses the same guide source. | **Partial.** Modules still run as separate local demos. There is no hosted Postgres, real auth, durable jobs, real-time delivery, provider adapters, CDN/WAF deployment or Android client. GitHub Pages cannot supply these services. |
| 18 Budget & running costs | `/build-status` models the PRD's one-time budget and accepts browser-local monthly provider quotes, with an exportable JSON plan. The PRD allocation lines add to about ৳12.1 lakh. | **External planning.** Obtain current written quotes for hosting, storage, SMS, gateway, auction-sheet partner, Play distribution, legal setup and marketing before approving spend. The PRD figures are not current quotations. |
| 19 Bangladesh legal/compliance | Draft privacy and terms pages, sample-data labels, opt-in local analytics, paid-placement disclosures, safety guidance and visible release gates exist. | **External gate.** A Bangladeshi lawyer must review entity/registration, digital-commerce applicability, current data rules, cross-border hosting, consumer claims, VAT, SMS sender identity, content moderation and payment/Play policies. A checklist is not legal approval. |
| 20 Go-to-market | Every sample car detail now offers WhatsApp, Facebook, native and copy-link sharing with attribution tags. `/build-status` records the PRD's showroom, buyer, seller and founding-dealer discovery targets locally. | **External execution.** Interviews, provider testing, founding-dealer agreements, concierge uploads, real campaigns and closed beta have not happened in the repository. No “50 dealers” claim should be displayed without evidence. |
| 21 Monetisation | The black-themed bilingual `/pricing` page has an interactive estimate for private sellers, boosts and auction sheets, plus dealer packs. `shared/pricing.ts` drives the commerce demo. Prices are marked hypotheses; there is no public checkout. | **Partial.** Validate prices with real sellers, approve taxes and refund rules, obtain a merchant account, implement signed gateway webhooks and durable entitlements before charges. The demo's `dealer_25` pack remains for compatibility; displayed hypotheses use 10/50/200. |
| 22 Milestones & timeline | `/build-status` offers a browser-local milestone checklist using the PRD's relative week/month targets and an exportable record. | **External scheduling.** Dates should be reset from an actual project start, provider onboarding and Android build plan. A checked box is self-reported, not a public MVP release. |
| 23 Risks & mitigations | All R1–R10 risks and mitigations are in the local workbench with a reviewed marker. Trust/moderation modules, payment verification interface and safety guidance address some technical risks. | **Partial.** Scam handling needs real staff, identity/document checks and a response SLA. Budget, policy, provider accuracy, competition and supply risks require operational evidence. |
| 24 Open questions | All O1–O10 are in the decision register and the browser-local workbench; notes can be exported as JSON. | **Open.** A draft note is not a partner, legal, policy or price decision. No decision was invented. |
| 25 Indonesia/Thailand | `shared/markets.ts` defines currency, language, location, ownership-document, payment-provider and vehicle-data extension points. BD is the only active demo market; ID and TH throw if activated. | **Partial.** Existing Bangladesh domain models still contain BDT-specific fields and document assumptions. Country discovery and a wider refactor are needed before any expansion claim. |

## Build and release gates

1. **Data and identity:** hosted transactional database, private document storage, real phone/Google sign-in, account deletion/export, role checks and admin 2FA; migrate the module demos onto those services.
2. **Trust operations:** unified moderation console, real document and dealer checks, audit trail, rate limits, report handling, published review policy and staffed response target.
3. **Commerce:** approved tariff and tax treatment, licensed gateway onboarding, verified webhooks, idempotent settlement/refunds, receipts, credit expiry and provider reconciliation.
4. **Delivery:** real push/SMS/email providers, durable outbox/retries, Android app or approved fallback, app links, account/saved/chat sync and Play policy review.
5. **Launch:** counsel-approved terms/privacy, data-region decision, business registrations, provider contracts, beta inventory and measured search-to-contact funnel. Only then remove sample labels and enable real users/payments.

## Decision register (PRD O1–O10)

| ID | Decision needed | Current state |
| --- | --- | --- |
| O1 | Auction-sheet partner, accuracy, turnaround, refund terms | Open; no partner account or test results supplied. |
| O2 | Bangladesh payment gateway and merchant onboarding | Open; no merchant account supplied. |
| O3 | Entity, registrations and digital-commerce obligations | Open; requires local professional review. |
| O4 | Hosting region and current data-transfer rules | Open; no production host selected. |
| O5 | Google Play payment policy for each digital product | Open; no Play Console account or app submission. |
| O6 | Validated private, boost, dealer-credit and sheet prices | Open; `/pricing` shows PRD hypotheses only. |
| O7 | Founding-dealer credit count and expiry | Open; grant mechanism exists in demo, policy unapproved. |
| O8 | Public registration-number masking | PRD recommends masking; enforce and verify across every future API/UI before real launch. |
| O9 | Domain and trademark clearance | Open; no clearance claim. |
| O10 | Default language | The black storefront now selects Bangla on Bangla-locale devices unless the visitor saved another choice. The header, safety/guides and pricing switch languages. Home and search still need full translation before this is complete. |

## Preview and verification

The public GitHub Pages build at `https://nahid271.github.io/CarBuy_Web/preview/` is a **static visual preview**. It can show sample-car filters and sharing, bilingual guidance/pricing, analytics choices and the browser-local `/build-status` workbench. It cannot execute the localhost-only seller, dealer, search, messaging or payment backends. To run the integrated local storefront, use the commands in [README.md](README.md). Before each launch gate is marked complete, add evidence from the real service or operation rather than relying on a demo test.
