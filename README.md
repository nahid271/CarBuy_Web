# CarBuy MVP modules

This repository contains the black-themed CarBuy storefront and Bangladesh marketplace MVP modules. The current work also adds trust/safety, SEO/content, payment-service foundations, notifications and analytics for PRD sections 9.9–9.15. The local demos use file-backed or in-memory storage and simulated identities/payments; they are **not a live transactional marketplace**. See the [full PRD audit](MVP-AUDIT.md) for sections 9.1–9.15 and Appendices A–B, and [MVP-STATUS.md](MVP-STATUS.md) for more detail on sections 9.9–9.15.

The requested follow-on work is tracked in [PRD sections 16–25](SECTIONS-16-25.md). The supplied PRD has no subsections numbered 9.16–9.25. The [shareable black-themed preview](https://nahid271.github.io/CarBuy_Web/preview/) now includes an [interactive marketplace demo](https://nahid271.github.io/CarBuy_Web/preview/studio/) with browser-local buyer, private seller, dealer and moderator journeys. Its personas, data, messages, credits and alerts are simulated on each visitor's device; it is not a live transactional marketplace. See [INTERACTIVE-DEMO.md](INTERACTIVE-DEMO.md) for the exact scope.

The public preview source is in [`preview-app/`](preview-app/README.md); `bash scripts/build-public-preview.sh` regenerates the committed `preview/` export. This keeps the GitHub Pages preview reviewable and reproducible.

| Module | Scope | Guide |
| --- | --- | --- |
| `marketplace/` | Black-themed Next.js storefront connected to sample inventory, search, detail and guides | [Marketplace README](marketplace/README.md) |
| `vehicle-data/` | Bangladesh-focused car catalogue, chassis decoding, validation, bilingual values and admin mapping workflow | [Vehicle data README](vehicle-data/README.md) |
| `listings/` | Private/dealer listing drafts, photos and papers, pricing, moderation, publishing, expiry and seller workflows | [Listings README](listings/README.md) |
| `dealers/` | Verified showroom profiles, stock, bulk import, credits, leads, alerts, reporting and mobile portal | [Dealers README](dealers/README.md) |
| `search/` | Buyer search, trust filters, ranking, facets, SEO routes, paid labels and discovery home | [Search README](search/README.md) |
| `vehicle-detail/` | Bilingual car pages, gallery, trust checks, protected contacts, reports and auction verification requests | [Vehicle detail README](vehicle-detail/README.md) |
| `messaging/` | Per-car chat, live buyer/seller inboxes, lead events, scam screening, private images and notification outbox | [Messaging README](messaging/README.md) |
| `saved-alerts/` | Account saved cars, live price/status changes, saved-search notification outbox and synced recent views | [Saved alerts README](saved-alerts/README.md) |
| `platform/` | Prototype payment, notification and consent-gated analytics services | [MVP status](MVP-STATUS.md) |

## Run the black-themed preview

With Node.js 22.18+ and two terminals, run `cd search && npm ci && npm run demo` in the first. Run `cd marketplace && npm ci && CARBUY_API_URL=http://127.0.0.1:4175 npm run dev -- --hostname 127.0.0.1 --port 3001` in the second. Open <http://127.0.0.1:3001/>. The server at port 4175 supplies sample inventory to the black storefront.

## Run the dealer portal

Use Node.js 22.18 or newer (Node 24 recommended):

```sh
cd vehicle-data && npm ci
cd ../listings && npm ci
cd ../dealers && npm ci
npm run check
npm test
npm run demo
```

Open `http://127.0.0.1:4174/` on the same computer. It starts with a sample verified dealer and fake data. **Do not enter real identity or payment details into the demo.** To check all modules, run `npm run check && npm test` within each directory.

To run the buyer search, detail, messaging and saved-alerts demo, install `messaging/` and `saved-alerts/` along with the earlier modules, then use `cd search && npm run demo`. Open `http://127.0.0.1:4175/car/demo-car-001`, tap **Save**, and visit `http://127.0.0.1:4175/saved`. The matching seller inbox is at `http://127.0.0.1:4175/seller-inbox`. The [start guide](START-HERE.md) and module READMEs describe the covered features. This is not a hosted marketplace: real authentication, payment webhooks, notification providers, and transactional PostgreSQL adapters must be connected before public launch.
