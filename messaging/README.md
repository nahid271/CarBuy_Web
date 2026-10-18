# CarBuy MVP 9.7 — Messaging & leads

This module adds buyer and seller inboxes to the 9.5/9.6 demo. From a car page, a verified buyer can open one conversation per car and send live messages. The seller can reply at `/seller-inbox`. Calls and WhatsApp taps appear as lead events. Buyer and seller chat pages use the same private JSON and server-sent-event endpoints, which can also serve a mobile app client.

## Run locally

Install dependencies in `vehicle-data/`, `listings/`, `dealers/`, `search/`, `vehicle-detail/` and `messaging/` with `npm ci`. From `messaging/`, run `npm run check && npm test && npm run demo`. Open `http://127.0.0.1:4175/car/demo-car-001`, tap **Chat**, and approve the fake verified buyer session. Open `http://127.0.0.1:4175/seller-inbox` in another tab and choose **Private seller** to reply. Choose **Dealer** for demo dealer cars such as `demo-car-002`. All people, contact numbers and notifications in the demo are fake. No real push, SMS or email is sent.

Real-file mode uses `CARBUY_LISTINGS_FILE` and writes messages to `messaging/.local/messages.json` and private sanitized images to `messaging/.local/images/`. It disables fake identities; connect the 9.1 buyer and seller identity provider before using it. The JSON store and in-memory limits are single-process development adapters, not production storage.

## PRD coverage

| ID | Implemented behavior |
| --- | --- |
| MSG-01 | One chat per buyer/car with Bangla and English quick questions. |
| MSG-02 | Chat, call and WhatsApp require the 9.6 signed-in, phone-verified buyer session. |
| MSG-03 | Web and app-compatible JSON plus authenticated SSE for live updates; notification port selects Android push, then SMS/email fallback if a seller has not opened the conversation after 15 minutes. Demo outbox never contacts anyone. |
| MSG-04 | Public HTML and JSON omit phone numbers; call/WhatsApp return them only after the authorized contact action. |
| MSG-05 | Bangla/English advance-payment, clearance-fee and impersonation patterns hold messages from the recipient; external links show a warning. Held messages remain in the moderation queue. |
| MSG-06 | Either participant can block a conversation and submit a reasoned report. Blocking also prevents subsequent call/WhatsApp reveals for that buyer/car. |
| MSG-07 | Per-buyer hourly limits for opens, messages, images, contact taps and reveals; same-origin CSRF and honeypot checks; optional production bot-verification port. |
| MSG-08 | Authenticated image sharing; only raster images under 6 MB are accepted, converted to metadata-free WebP, and read through an authorized private endpoint. |
| MSG-09 | Seller response time is measured from the first buyer message to a seller reply and shown on the car page once available. |

## API and production integration

`GET /api/messaging/conversations`, `/api/messaging/leads` and `/api/messaging/conversations/:id` return participant-only data. `GET /api/messaging/conversations/:id/events` is the authenticated SSE stream. `POST /api/messaging/open`, `/:id/messages`, `/:id/images`, `/:id/block` and `/:id/report` require a same-origin request and CSRF token. `GET /:id/image/:attachmentId` checks conversation membership before returning private WebP bytes. The browser app is at `/inbox`, `/seller-inbox` and `/chat/:id` (also `/bn/...`).

Apply [`sql/006_messaging.sql`](sql/006_messaging.sql) after the earlier migrations. A production adapter needs PostgreSQL transactions, Redis or equivalent shared rate limiting, durable event fanout, Android push/SMS/email providers, and a retrying outbox worker. Connect moderation decisions for held messages and conversation reports, a real bot challenge provider, malware/OCR checks for shared images, retention rules, and account-level seller/dealer permissions. The local SSE implementation is single-node; no external notification delivery is configured. Do not put real customer data in demo JSON files.
