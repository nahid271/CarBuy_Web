# 9.8 Saved cars and alerts

This module implements the buyer-facing saved space in the combined search demo at `http://127.0.0.1:4175/saved` (Bangla: `/bn/saved`). It uses the existing demo buyer session; the production integration must attach the same handlers to the real 9.1 authenticated, phone-verified buyer identity.

| PRD ID | Implemented behavior |
| --- | --- |
| SAV-01 | Save/unsave from search cards and detail pages. A guest is prompted to sign in; after demo sign-in, the original save completes. Saved rows belong to a buyer account, with a 200-car limit. |
| SAV-02 | Saved list shows live, sold, expired, or unavailable state from current inventory. It compares current price with the price when saved to show drops in BDT. |
| SAV-03 | Save a validated search and choose app push and/or email, plus instant or daily delivery. Existing matches form a baseline; new matching listings enter an account-scoped notification outbox. Daily digests release after 09:00 Asia/Dhaka. The local demo checks each minute. |
| SAV-04 | Each alert has a one-tap Unsubscribe action, restricted to its owner. It stops future matching and clears pending matches. |
| SAV-05 | Signed-in views are stored by buyer and shown across sessions. Guest recent history imports to the account after sign-in, then local history clears. |

## Run and test

Install dependencies in `vehicle-data`, `listings`, `dealers`, `search`, `vehicle-detail`, `messaging`, and `saved-alerts` using `npm ci`. Then:

```sh
cd saved-alerts
npm run check
npm test
cd ../search
npm run demo
```

Open `/cars`, tap a heart, accept the fake buyer sign-in, and open `/saved`. Search alerts can be created from a filtered search result or on the saved page. The demo notification preview shows queued push/email events; **no real message is sent**. To test a new match, add a newly published matching listing to the inventory and wait up to one minute or call `SavedService.processAlerts()` in a test.

## API

All `/api/saved/*` endpoints require an authenticated, phone-verified buyer. Mutations require same-origin requests and the `x-csrf-token` returned by `/api/detail/session`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/saved/cars?locale=en` | Account shortlist and live state/price projection |
| POST / DELETE | `/api/saved/cars/:id` | Save / remove a car |
| GET | `/api/saved/recent?locale=en` | Recent live cards |
| POST | `/api/saved/recent/:id` | Record a detail-page view |
| POST | `/api/saved/recent/sync` | Import up to 20 guest IDs |
| GET / POST | `/api/saved/alerts` | List / create saved searches |
| DELETE | `/api/saved/alerts/:id` | One-tap unsubscribe |
| GET | `/api/saved/deliveries` | Buyer-scoped notification preview |

Production needs a persistent transactional adapter for `sql/007_saved_alerts.sql`, a durable matching worker/queue, and actual app push/email delivery adapters wired to verified account destinations and opt-in preferences. The local JSON adapter is suitable only for one process. The fake demo session is memory-only and resets on restart. Database schema assumes UUID production account and listing IDs, while demo IDs are human-readable strings. Delivery providers should use outbox IDs for idempotency, retries and failure tracking. Do not claim messages were delivered from this demo's queued state.
