# CarBuy MVP 9.6 — Vehicle detail page

This module adds a bilingual, server-rendered car page at `/car/:id` and `/bn/car/:id` to the 9.5 buyer demo. It reads 9.2 catalogue, 9.3 listings and 9.4 dealer data. Public responses are projections: no seller phone, full chassis, registration number, paper storage key or moderation note is embedded in HTML or the public JSON API.

## Run

Use Node.js 22.18+ and install the four earlier modules plus this one. From `vehicle-detail/`, run `npm ci && npm run check && npm test && npm run demo`. Open `http://127.0.0.1:4175/car/demo-car-001`; follow a search card to see other cars. The seeded cars, images, buyers, dealers, payments and phone numbers are fake. The demo buyer signs in on the first restricted action. No real account is created and no money is charged.

Set `CARBUY_LISTINGS_FILE` to the 9.3 JSON store to view your inventory. Optional `CARBUY_CATALOG_FILE`, `CARBUY_DEALERS_FILE`, `CARBUY_MEDIA_DIR` and `PUBLIC_BASE_URL` follow the [9.5 setup](../search/README.md). Real-file mode disables fake sign-in and payment; connect 9.1 identity, verified-phone claims, seller profiles, payment provider and moderation before using protected buyer actions. Activity is written to `vehicle-detail/.local/activity.json` only in this single-process mode. Never put real sensitive data in the local demo files.

## PRD coverage

| ID | Behavior |
| --- | --- |
| VDP-01 | Four-photo seeded gallery with count, fullscreen dialog, zoom, keyboard and touch navigation; actual listing photos appear when present. |
| VDP-02 | Bilingual title, taka/lakh price, negotiation flag, core specifications and location. |
| VDP-03 | Details, active feature names, seller description and translation toggle through a translation port. |
| VDP-04 | Verified versus seller-provided auction state, grade, auction mileage mismatch, papers check, masked chassis, logged full reveal and tax/fitness expiries. |
| VDP-05 | Private seller summary or verified dealer profile with logo, address and hours. Contact numbers stay behind an action. |
| VDP-06 | Verified-phone buyer gate for chat, call and WhatsApp; each action records a lead. Chat handoff is reserved for 9.7. |
| VDP-07 | Buyer-paid auction verification order, idempotent pending request, trusted payment proof and ordered state. Demo checkout is fake. |
| VDP-08 | Browser-local save, native/copy share, WhatsApp/Facebook share and authenticated report. |
| VDP-09 | Up to four similar live cars, preferring the same model. |
| VDP-10 | Bangladesh-specific advance-payment, auction-sheet and BRTA-paper safety guidance. |
| VDP-11 | Sold/expired page persists 30 days, then redirects to make/model results. Contact closes immediately. |
| VDP-12 | Server-rendered metadata, canonical/hreflang, OG image and Car/Offer JSON-LD. |
| VDP-13 | Price change history and days listed. |
| VDP-14 | Engine-cc band and fuel hint, with a link to current BRTA guidance; no stale tax estimate is presented. |

## Interfaces and production work

`GET /api/detail/:id` returns only public fields. `GET /api/detail/:id/translate?to=bn|en` returns a translated description. `GET /api/detail/session` exposes only the current buyer summary and CSRF token. Authenticated POST routes `/chassis`, `/contact`, `/report` and `/auction-verification` require a same-origin request and CSRF token. Demo-only `/api/demo/sign-in`, `/api/demo/sign-out` and `/api/demo/verification-pay` exist when no real listings file is set. The server uses HttpOnly, SameSite=Lax session cookies and does not trust a buyer ID supplied in a request body.

Apply [`sql/005_vehicle_detail.sql`](sql/005_vehicle_detail.sql) after the first four migrations when moving to PostgreSQL. It provides protected lead, reveal, report and verification-order records. Build transactional adapters, retention and abuse limits around these tables; wire payment webhooks to the trusted system confirmation method, and route paid requests and reports to moderation. Section 9.7 must supply live messaging. The 9.3 moderator method `verifyAuctionSheet` records the resulting verified grade and mileage after a real document check. Connect a production translation provider and 9.1 private-seller profile source as well. Browser-local saves are not account-synced.
