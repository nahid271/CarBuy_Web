# CarBuy MVP 9.4 — Dealers

This module implements **DLR-01 through DLR-12** from section 9.4 of the supplied PRD. It builds on the included 9.2 vehicle catalogue and 9.3 listings modules. The domain logic is runnable, tested, and exposed through a responsive local dealer portal at `http://127.0.0.1:4174/`.

## Run the local demo

Requires Node.js **22.18+** (Node 24 recommended). From the root of the shared package:

```sh
cd vehicle-data && npm install
cd ../listings && npm install
cd ../dealers && npm install
npm run check
npm test
npm run demo
```

Open `http://127.0.0.1:4174/`. The server listens only on `127.0.0.1` and creates a clearly labelled sample showroom, fake identity numbers, and 5 sample founding credits on first start. Data and the NID encryption key live under `dealers/.local/`, which is excluded from the shared ZIP. Do **not** enter real NID, TIN, or payment details into the demo.

## Requirements map

| PRD ID | Implemented behaviour | Main files |
|---|---|---|
| DLR-01 | Application captures showroom, trade licence, TIN, encrypted owner NID, address, 1–3 phones, logo, hours, optional BARVIDA. Moderator records visit/video review and a note before verification. | `src/service.ts`, `src/vault.ts`, portal Verification |
| DLR-02 | Public `/dealer/:slug` page and `/api/dealer/:slug` expose verified badge, logo, map link, hours, phone/WhatsApp, about and live stock only. | `src/service.ts`, `src/demo-server.ts` |
| DLR-03 | Shared showroom listing editor supports unique stock number, Ready/Pre-order with required arrival date, after-sales notes and the full 9.3 car fields/photos. | `src/service.ts`, `web/app.js`, `listings/src/validation.ts` |
| DLR-04 | Download CSV/XLSX templates, validate up to 500 rows with row-level errors, import valid rows as drafts, upload matching photos named `STOCKNUMBER__1.jpg`. | `src/bulk.ts`, `src/service.ts`, portal Bulk tools |
| DLR-05 | Configured bKash/Nagad/card pack choice, gateway port, idempotent credit ledger, 1 credit per 30-day dealer listing or renewal, optional auto-renew, low-credit alerts. | `src/credits.ts`, `src/service.ts`, portal Credits |
| DLR-06 | Per-car chat/call/WhatsApp lead events, inbox status, staff assignment, follow-up notes. | `src/service.ts`, portal Lead inbox |
| DLR-07 | Notification dispatch port for push, opt-in SMS and opt-in email; queued/sent/failed status stored for each alert. | `src/service.ts`, `src/types.ts` |
| DLR-08 | Per-car and total impressions, views, contacts by channel and saves, with CSV export. | `src/service.ts`, portal Overview |
| DLR-09 | Moderator concierge stock creation is recorded in an audit log. | `src/service.ts`, portal Bulk tools / Activity log |
| DLR-10 | Portal is responsive for narrow mobile browsers and uses touch-sized controls and horizontally scrollable tables. | `web/index.html`, `web/styles.css`, `web/app.js` |
| DLR-11 | Bulk mark sold, renew and price change, with a per-car success/error report and 100-car limit. | `src/service.ts`, portal My stock |
| DLR-12 | Starter credits grant once on verified dealer creation if the verification date falls within the configured founding window. | `src/service.ts` (`DealerConfig`) |

## Data and trust boundaries

- Dealer stock is owned by the **showroom organisation**, so approved staff share one inventory. Role checks limit profile/credits/bulk management to owner or manager as appropriate.
- NID is encrypted with AES-256-GCM. Only a moderator can call the sensitive review method. Local files and key use restrictive permissions. Application APIs omit the encrypted NID field.
- Checkout confirmation is accepted only from a trusted system actor and a gateway verification callback. Pack and listing debit operations are idempotent. Rejected first-time listings return their credit.
- Photos use the 9.3 pipeline: normalized WebP/AVIF, stripped metadata, duplicate detection and quality hints. Private 9.3 vehicle papers are not served by dealer public pages.
- CSV output escapes spreadsheet formula prefixes. XLSX imports reject formula cells, enforce the template headers and cap file/row size.
- The SQL migration `sql/003_dealers.sql` models applications, organisations, staff, stock, purchases, credit ledger, leads/events, notifications and audit. It enables default-deny row-level security.

## Production connections still required

The local portal is a **functional demo**, not a public deployment. It uses one hardcoded sample user/moderator, simulated bKash/Nagad/card payments, and notification adapters that record dispatch but do not contact providers. Before public launch, connect the 9.1 authentication system (verified phone, sessions, real staff invitations, moderator access), real payment gateway webhooks, push/SMS/email providers, and a PostgreSQL persistence adapter. The PostgreSQL adapter must update listing order/status and credit balance in one transaction with row locks; the local JSON stores only coordinate within one process. Add rate limiting, monitoring, backups, and hosted media before exposing it to buyers.

The demo API's `/api/demo/*` routes are **test controls** and must not be deployed. The example credit prices and founding period in `demoDealerConfig` are product placeholders, not final commercial terms.

## Files

- `src/service.ts` — dealer domain actions and authorisation
- `src/credits.ts` — prepaid listing billing adapter
- `src/bulk.ts` — CSV/XLSX import and validation
- `src/store.ts` — memory and local JSON stores
- `src/vault.ts` — owner NID encryption
- `src/demo-server.ts` — local API and public profile page
- `web/` — mobile web portal
- `sql/003_dealers.sql` — PostgreSQL target schema
- `test/dealers.test.ts` — end-to-end domain tests

To validate every included module, run `npm run check && npm test` in each of `vehicle-data`, `listings`, and `dealers`.
