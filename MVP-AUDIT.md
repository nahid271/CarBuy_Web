# CarBuy MVP requirement audit

Audited 20 November 2026 against the user-supplied `PRD.html` and repository commit `4bf4cca`. This is a code-and-test audit, not a production launch certification. The PRD has **131 requirement IDs in sections 9.1–9.15**. It has **no sections 9.16–9.25**; its numbered sections 10–25 discuss launch and later planning. Appendix A is the MVP screen inventory, Appendix B the notification matrix, and Appendices C–D are a glossary and sources.

**Verdict: the actual CarBuy MVP is not complete.** The repository contains substantial local prototypes, but no production identity system, hosted transactional data layer, live payment or notification providers, Android app, or unified admin console. The public GitHub Pages link is a static **visual preview** with sample cars, not the operational marketplace. “Local” below means behavior exists in a local service or demo and may have tests; it does **not** mean deployed, integrated, secure for real customer data, or ready for launch. “Partial” means a required part or integration is absent. “Missing” means there is no meaningful implementation of the requirement.

| PRD section | Local IDs | Partial IDs | Missing IDs | Main gap |
| --- | --- | --- | --- | --- |
| 9.1 Accounts & identity | — | ACC-02, 06, 07, 08, 09 | ACC-01, 03, 04, 05, 10, 11, 12 | Demo identity gates and dealer role models exist, but there is no real +880 SMS/Google sign-in, account lifecycle, admin 2FA, or export. ACC-12 is explicitly planned for Launch in the PRD. |
| 9.2 Vehicle data | VEH-01–07 | — | — | Curated bilingual taxonomy, decoder, validation and checklist work locally. Seed is limited, and a production catalogue, licensed data, and transactional chassis claims are not connected. |
| 9.3 Listings | LST-02, 03, 04, 08, 10, 11, 12, 14, 15, 17 | LST-01, 05, 06, 07, 09, 13, 16 | — | Responsive seller demo and lifecycle exist. Android draft sync/camera, real identity, object storage, gateway, reminder delivery, fully connected metrics, and AI provider are absent. |
| 9.4 Dealers | DLR-02, 03, 04, 08, 09, 10, 11, 12 | DLR-01, 05, 06, 07 | — | Local mobile portal, bulk tools, roles, stock and credits exist. Real trade-licence checks, gateway, cross-module leads and delivery providers are not connected. |
| 9.5 Search & discovery | SRC-01–06, 08–11 | SRC-07 | — | Search demo has filters, ranking, bilingual routes and pagination. The black storefront does not yet integrate the whole discovery and recently-viewed experience as one deployed site. |
| 9.6 Vehicle detail | VDP-01, 02, 08–14 | VDP-03–07 | — | Detail demo has gallery, metadata, safety and history. Translation, true document checks, seller identity/contact, and paid verification need production providers and integration. |
| 9.7 Messaging & leads | MSG-01, 04, 05, 06, 08, 09 | MSG-02, 03, 07 | — | Local chat, scam rules, reports and private images exist. Real buyer authentication, Android push/SMS/email fallback, shared rate limits and bot checks are absent. |
| 9.8 Saved cars & alerts | SAV-02, 04 | SAV-01, 03, 05 | — | Local saves, state changes and alert outbox exist. Real account sync, app sync and push/email delivery are absent. |
| 9.9 Trust & safety | TNS-03, 09 | TNS-01, 02, 04–08 | TNS-10 | Review rules, risk signals and guidance exist locally. No staffed four-hour SLA, complete OCR/stock-photo enforcement, phone/device ban console, real paper/dealer checks, or Android UGC compliance. |
| 9.10 Payments | — | PAY-01–05, 07, 08 | PAY-06 | Gateway interface, prices, orders, coupons, credits and refunds are prototypes. No merchant account, real payment adapter, durable settlement/webhooks, VAT configuration, or Android purchase-policy flow. |
| 9.11 Android app | — | — | APP-01–06 | No Android project, app client, FCM, app links, offline storage, performance test or Play Store release. |
| 9.12 SEO & content | — | SEO-01–05 | — | Server rendering and bilingual SEO/content primitives exist, but the black storefront is not fully integrated, Core Web Vitals are unmeasured, price guides use sample data, and legal pages are drafts. Public preview intentionally has `noindex`. |
| 9.13 Notifications | — | NOT-01–03 | — | Channel matrix, bilingual templates, preferences and local outbox exist. No sign-in SMS, FCM, email/SMS providers, durable delivery worker or complete event wiring. |
| 9.14 Admin & back office | — | ADM-03–08 | ADM-01, 02, 09 | Modules expose admin methods and some audit records; there is no unified role-protected console, cross-module lookup, complete queues, central audit, or KPI dashboard. |
| 9.15 Analytics | — | ANL-01–03 | — | Consent-gated event model and attribution parser exist. Web/app instrumentation, consent notice UI, durable analytics store and dashboards are absent. |

The table names **every PRD ID once**: 54 local, 59 partial, 18 missing. No section qualifies as a fully integrated, launch-ready product. Optional “Should” and “Could” items are included in the audit; the absence of the Android app and real authentication also blocks many “Must” items.

## Appendices

| Appendix | Audit result |
| --- | --- |
| A — Public web screens | **Partial.** Home, search, detail, dealer profile, sell and content prototypes exist across separate modules. Fixed black-theme interface copy now switches English/Bangla, but model-price pages driven by live stock, localized SEO routes, arbitrary seller-written content translation and final legal/contact pages are missing. |
| A — Android screens | **Missing.** No Android app or the specified search, chat, saved, sell, account and notification screens. |
| A — Dealer portal | **Local prototype.** Dashboard, stock, editor, bulk tools, credits, leads, stats, team and profile exist in the local responsive dealer demo; payment, account and notification integrations remain simulated. |
| A — Admin console | **Partial.** Scattered moderator/catalog/dealer/commerce operations exist, but the specified unified queues, reports, cross-module lookup, configuration and audit interface do not. |
| B — Notification matrix | **Partial.** `platform/src/notifications.ts` models most push, in-app, email and SMS rows, but it has no WhatsApp channel, no sign-in-code event, no provider delivery or durable dispatch. The matrix is not end-to-end tested across actual user journeys. |
| C — Glossary | Terminology reference, not a feature acceptance criterion. The code follows the key reconditioned/used, chassis and lakh concepts in its local models. |
| D — Sources | Reference list, not a feature acceptance criterion. Live verification, legal and provider claims still need operational validation. |

## Evidence and verification

- `vehicle-data/`, `listings/`, `dealers/`, `search/`, `vehicle-detail/`, `messaging/`, `saved-alerts/` and `platform/` each passed `npm run check` and `npm test` on 20 November 2026: **55 tests passed** in total. These are module-level checks, not production end-to-end tests.
- `marketplace/` passed `npm run build` and `npm run lint`. It still calls a localhost sample inventory service at runtime and cannot operate as a public marketplace through GitHub Pages.
- Domain feature maps and boundaries: [vehicle data](vehicle-data/README.md), [listings](listings/README.md), [dealers](dealers/README.md), [search](search/README.md), [vehicle detail](vehicle-detail/README.md), [messaging](messaging/README.md), [saved cars](saved-alerts/README.md), and [later MVP modules](MVP-STATUS.md).

## Critical path to a real MVP

1. Build 9.1 production accounts and secure admin roles, including phone verification, account deletion/export, dealer staff permissions and admin 2FA.
2. Replace file/in-memory demos with transactional hosted PostgreSQL, private object storage, shared rate limiting and authenticated APIs; connect the black storefront to those APIs.
3. Integrate a Bangladesh payment gateway and real order/refund/webhook workflow, then push/email/SMS providers and durable event delivery.
4. Build and test the Android app and required screens, push, links, camera/offline flows, performance targets and Play release process.
5. Build a unified admin console and operational review/verification team; complete content, legal, privacy, analytics and launch monitoring before accepting real users or payments.
