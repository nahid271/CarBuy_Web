# CarBuy listings MVP — PRD 9.3

This package implements the listings domain and a responsive, local sell-flow demo. It uses the sibling `vehicle-data/` package from PRD 9.2 for taxonomy, chassis validation and value sets. The demo is deliberately bound to `127.0.0.1`; it has a fixed demonstration seller and simulated payment/moderation. **Do not deploy the demo server as a public service or upload real documents to it.** The service classes, tests and SQL migration are the integration starting point for the authenticated CarBuy application.

## Run the demo

Requires Node.js 22.18+ and both `listings/` and `vehicle-data/` beside each other.

```bash
cd listings
npm install
npm test
npm run check
npm run demo
```

Open `http://127.0.0.1:4173`. The web flow autosaves each field to `.local/listings.json`; reopening a draft in the same local demo restores it. The shared backend service is designed for an Android client to call through an authenticated API once PRD 9.1 and 9.11 are built. Local media is stored in `.local/media/`; papers are in the private directory and have no public HTTP route. `PORT=4174 npm run demo` changes the local port.

## Coverage by requirement

| ID | Delivered here | External integration still needed |
| --- | --- | --- |
| LST-01 | Nine-step responsive sell flow, server-side autosave, draft versions for cross-device conflict detection, validation → payment → review. | Real 9.1 sign-in and 9.11 Android client. |
| LST-02 | Used and reconditioned conditions with registration-year rules. | — |
| LST-03 | Required/optional fields and catalogue checks; minimum four photos. | — |
| LST-04 | BDT parser for lakh/crore and Bangla digits; Indian grouping, negotiable flag. | — |
| LST-05 | 20 private / 30 dealer photo caps, camera input, browser resize, server WebP/AVIF output, metadata removal, reorder and remove. | Production object storage/CDN. |
| LST-06 | Private paper uploads, moderator-only read method, papers-checked state. | Private cloud bucket, moderator authentication and signed URLs. |
| LST-07 | Seller auction image marked `seller_provided_unverified`. | Paid verification order belongs to PRD 9.10. |
| LST-08 | Bangla/English description input and validation. | — |
| LST-09 | Pending payment/review/live/sold/withdrawn/expired/rejected lifecycle; private 60-day term, renewal, 7/1-day reminder events, refund on first-publication rejection. | Real gateway and reminder delivery (PRD 9.10/9.12). |
| LST-10 | Live edits, material-edit review, every price change recorded. | — |
| LST-11 | Sold outcome: CarBuy, elsewhere, showroom trade-in, didn't sell. | — |
| LST-12 | Three active private cars enforced in service and target SQL trigger. | Dealer account eligibility (PRD 9.4). |
| LST-13 | My listings with status, views, contact counts, saves and days live; trusted engagement hook. | Wire actual 9.7/9.6 events. |
| LST-14 | WhatsApp, Facebook, Messenger and copy-link URLs. | Public domain and app deep links. |
| LST-15 | Median/low/high price guidance when five live comparable cars exist. | More stock improves usefulness. |
| LST-16 | Editable description suggestion and a `TranslationPort` for AI draft/translation. | Configure an AI provider; translation fails explicitly until then. |
| LST-17 | Dark/blurry photo hints and exact duplicate blocking. | Further image-quality calibration. |

The SQL migration is a **target production schema**, not an adapter for the local JSON store. It adds a live-vehicle unique index, private-seller cap trigger, separate vehicle/listing records, photo/paper/order/history/metrics/audit tables and default-deny row-level security. A production Postgres repository must map the domain objects to these tables transactionally. The full chassis value is in the protected vehicle table; public JSON explicitly rejects chassis and registration fields. Configure a private papers bucket and identity-based policies before public launch.

## Important behaviour

The seller must confirm the grade after decoding; `NZT260` can mean Allion or Premio. `beginSubmission` validates the whole listing before creating a payment order. A trusted gateway callback uses `confirmPayment`; an ordinary client cannot declare its own order paid through the service. The local demo's `demo-pay` button is a simulation only. All new private listings enter moderator review. A material edit of an already-paid listing can be corrected and resubmitted within its existing term without another charge. Initial rejection requests a refund; if the gateway refund fails, the order remains `refund_pending` for retry.

For a real backend, construct `ListingService(store, catalog, billing, clock, privateFeeBdt, translation)`. `BillingPort` must create checkout, verify a payment notification with the payment provider and refund an order. `TranslationPort` is optional; without it the draft helper returns a plain template and translation reports that no provider is configured. The default fee of ৳400 is a **demo configuration**, not a final business price.

`JsonListingStore` is single-process local persistence. Production must use database transactions for the active limit, duplicate chassis, order idempotency, price history and state changes. The included SQL migration adds several database guards, but it has no owner/moderator policies until 9.1 defines trusted identity claims. Until then, leave it inaccessible to client database roles.

Photo processing uses [Sharp](https://sharp.pixelplumbing.com/api-output/) to produce WebP and AVIF and remove EXIF/GPS metadata by default. Original buyer-facing photos are not retained. PDF papers are kept in the private store; production should add malware scanning and encrypted object storage.
