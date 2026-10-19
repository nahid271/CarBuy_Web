# CarBuy MVP modules

This repository contains CarBuy Bangladesh marketplace MVP modules for PRD sections **9.2 Vehicle Data**, **9.3 Listings**, **9.4 Dealers**, **9.5 Search & Discovery**, **9.6 Vehicle Detail Page**, **9.7 Messaging & Leads**, and **9.8 Saved Cars & Alerts**. Each module has its own README, tests, and PostgreSQL target schema. The local demos use file-backed storage and simulated identities/payments; production integration requirements are documented in each module.

| Module | Scope | Guide |
| --- | --- | --- |
| `marketplace/` | Buyer-facing storefront (Next.js, Tailwind CSS, shadcn/ui, Motion, Lenis) with a monotone theme | `cd marketplace && npm install && npm run dev` |
| `vehicle-data/` | Bangladesh-focused car catalogue, chassis decoding, validation, bilingual values and admin mapping workflow | [Vehicle data README](vehicle-data/README.md) |
| `listings/` | Private/dealer listing drafts, photos and papers, pricing, moderation, publishing, expiry and seller workflows | [Listings README](listings/README.md) |
| `dealers/` | Verified showroom profiles, stock, bulk import, credits, leads, alerts, reporting and mobile portal | [Dealers README](dealers/README.md) |
| `search/` | Buyer search, trust filters, ranking, facets, SEO routes, paid labels and discovery home | [Search README](search/README.md) |
| `vehicle-detail/` | Bilingual car pages, gallery, trust checks, protected contacts, reports and auction verification requests | [Vehicle detail README](vehicle-detail/README.md) |
| `messaging/` | Per-car chat, live buyer/seller inboxes, lead events, scam screening, private images and notification outbox | [Messaging README](messaging/README.md) |
| `saved-alerts/` | Account saved cars, live price/status changes, saved-search notification outbox and synced recent views | [Saved alerts README](saved-alerts/README.md) |

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
