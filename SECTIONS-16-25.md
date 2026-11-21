# CarBuy PRD sections 16–25: implementation and launch register

The supplied PRD ends its MVP functional requirement IDs at **9.15**. This register interprets the requested “9.16–9.25” as the PRD's main **sections 16–25**. It distinguishes code that runs in the black-themed marketplace from operational work that cannot be completed by a code push. The [9.1–9.15 audit](MVP-AUDIT.md) remains the baseline for the actual MVP.

| PRD section | Delivered in this repository | Completion boundary |
| --- | --- | --- |
| 16 Analytics events | `platform/src/analytics.ts` defines the full 24-event vocabulary, consent gate, attribution parser and property allowlist. The black storefront now asks for consent, records search/listing/detail events locally, and allows export, deletion and withdrawal. | **Partial.** Browser events are local to a visitor's device; there is no production analytics store, dashboard, app instrumentation or end-to-end funnel report. Other events must be wired at their real transaction boundaries. |
| 17 Architecture & stack | Modules are kept in this repository; shared pricing and typed market configuration now live in `shared/`. `marketplace/` is the black-themed Next.js front end. | **Partial.** The modules still run as separate local demos. There is no hosted Postgres, real auth, durable job queue, real-time delivery, provider adapters, CDN/WAF deployment, or Android client. A static GitHub Pages preview cannot supply these services. |
| 18 Budget & running costs | The PRD's budget remains a planning baseline. The implementation uses sample data and local services to avoid charging providers during the preview. | **External planning.** Obtain current written quotes for hosting, storage, SMS, gateway, auction-sheet partner, Play distribution, legal setup and marketing before approving spend. The PRD's dollar/taka figures are not current quotations. |
| 19 Bangladesh legal/compliance | Draft privacy and terms pages, sample-data labels, opt-in local analytics, paid-placement price labels and safety guidance exist. | **External gate.** A Bangladeshi lawyer must review entity/registration, digital-commerce applicability, current data rules, cross-border hosting, consumer claims, VAT, SMS sender identity, content moderation and payment/Play policies. Do not replace this with code assertions. |
| 20 Go-to-market | Public shareable visual preview, dealer and seller guidance, safety content and sample listing links support discovery interviews. | **External execution.** Showroom/buyer/seller interviews, provider testing, founding-dealer agreements, concierge uploads, real campaigns and closed beta have not happened in the repository. No “50 dealers” claim should be displayed without evidence. |
| 21 Monetisation | A black-themed `/pricing` page has an interactive estimate for private sellers, boosts and auction sheets, plus dealer packs. `shared/pricing.ts` drives the commerce demo. Prices are clearly marked hypotheses and no public checkout is offered. | **Partial.** Validate prices with real sellers, approve taxes and refund rules, obtain a merchant account, implement signed gateway webhooks and durable entitlements before any real charges. The demo's `dealer_25` pack remains for compatibility; displayed launch hypotheses use 10/50/200. |
| 22 Milestones & timeline | This register gives the build-to-launch gates below. The PRD's week/month targets remain planning assumptions. | **External scheduling.** Dates should be reset from an actual project start, provider onboarding and Android build plan. A GitHub push is not a closed beta or public MVP release. |
| 23 Risks & mitigations | Sample trust labels, moderation/risk modules, payment verification interface, opt-in analytics and safe listing guidance address parts of the documented risks. | **Partial.** Scam handling needs real staff, identity/document checks and a response SLA. Budget, policy, provider accuracy, competition and supply risks require ongoing operational evidence. |
| 24 Open questions | The decision register below preserves O1–O10 as explicit launch decisions. | **Open.** No partner, legal, platform-policy or price decision was invented. |
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
| O10 | Default language | PRD recommends Bangla on Bangla-locale devices; the current black storefront is primarily English, so this is not complete. |

## Preview and verification

The public GitHub Pages build at `https://nahid271.github.io/CarBuy_Web/preview/` is a **static visual preview**. It can show the new pricing and analytics-consent interactions but cannot execute the localhost-only seller, dealer, search, messaging or payment backends. To run the integrated local storefront, use the commands in [README.md](README.md). Before each launch gate is marked complete, add evidence from the real service or operation rather than relying on a demo test.
