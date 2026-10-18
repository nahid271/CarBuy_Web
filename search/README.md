# CarBuy MVP 9.5 — Search & Discovery

This module reads the approved **live and unexpired** inventory from 9.3, enriches it with the 9.2 bilingual catalogue and 9.4 dealer verification state, and serves a buyer search experience for Bangladesh. It never returns chassis numbers, registration identifiers, private documents, seller contacts, or moderation notes in a search card.

## Run locally

Node.js 22.18+ is required. From this repository:

```sh
cd vehicle-data && npm ci
cd ../listings && npm ci
cd ../dealers && npm ci
cd ../search && npm ci
npm run check
npm test
npm run demo
```

Open `http://127.0.0.1:4175/`. By default the demo seeds 48 **fake** live cars, a fake verified dealer, and paid-placement examples. The car images are generated SVG illustrations. No real user account or payment is involved.

To browse listings from the existing 9.3 local store, run:

```sh
CARBUY_LISTINGS_FILE=../listings/.local/listings.json \
CARBUY_DEALERS_FILE=../dealers/.local/dealers.json \
CARBUY_CATALOG_FILE=../vehicle-data/.local/catalog.json \
CARBUY_MEDIA_DIR=../listings/.local/media \
CARBUY_PROMOTIONS_FILE=../search/.local/promotions.json \
npm run demo
```

Only `CARBUY_LISTINGS_FILE` is required; other paths are optional and fall back to seed catalogue, no dealer verification, no paid promotions, and the default listings media folder. The optional promotion file is a read-only JSON array of paid rows (`listingId`, `kind`, `status`, `paymentReference`, `startsAt`, `endsAt`) written by a trusted payment workflow. Search never creates promotions from buyer input. Real-file mode is **read-only** in this demo, avoiding cross-process JSON write races. Run the 9.3/9.4 demos separately for seller/dealer workflows.

## PRD coverage

| ID | Implemented behavior |
| --- | --- |
| SRC-01 | Condition, make, up to ten models, grade, lakh price range, manufacture and registration years, mileage, cc, fuel, body, transmission, colour, seller type, division, district, area and keyword filters. Server validates URL parameters. |
| SRC-02 | Auction-sheet verification, papers checked, verified dealer and minimum verified auction grade. Trust flags come from moderation/dealer state, not seller claims. |
| SRC-03 | Best match, newest, price ascending/descending, lowest mileage and newest model year. Stable tie-breaking. |
| SRC-04 | Public-only result cards show photo, year/make/model/grade, price in lakh, condition, mileage, cc, fuel, area, trust badges, paid-placement labels and a browser-local save action. |
| SRC-05 | Shareable filter URLs; server-rendered English/Bangla home/search pages, district and make/model routes, canonical and alternate links. |
| SRC-06 | Low/no-result suggestions and browser-local saved search; this 9.5 demo does not send alerts. Notifications belong to 9.7. |
| SRC-07 | Home quick search, popular models, body and budget entry points, new listings and recently viewed cars on the current browser. |
| SRC-08 | Organic relevance + freshness + listing quality + trust ranking. Only active, paid, referenced promotions are eligible. At most three boosted cards per 24-result page; all boosted cards carry a `Top · Paid` or `Featured · Paid` label. |
| SRC-09 | 24 results per web page with previous/next links; mobile viewport loads more via validated cursor as the sentinel approaches. |
| SRC-10 | English/Bangla catalogue names and aliases, including Noah/নোয়া and X-Trail/xtrail; punctuation-insensitive matching. |
| SRC-11 | Per-option counts for condition, make, model, grade, fuel, body, transmission, seller, division, district, area, colour and trust filters. |

## API and integration

- `GET /api/bootstrap` — catalogue, 8 divisions and 64 districts, localized value maps.
- `GET /api/search?route=/cars&...` — query, cards, counts, suggestions, pagination and cursor.
- `GET /api/app-search?route=/cars&cursor=...` — next 24 cards for mobile consumers.
- `GET /api/home?locale=en|bn` — discovery modules.
- `GET /api/recent?ids=id1,id2&locale=en|bn` — live public cards only, maximum 20 IDs.
- `GET /car/:id` and `/bn/car/:id` — full 9.6 vehicle detail page; `/preview/:id` redirects to it.

The production target migration is [`sql/004_search.sql`](sql/004_search.sql), applied after 9.3 and 9.4 migrations. It adds filter indexes, a paid-promotion table and a public-only SQL search view with RLS. A production `SearchStore` must query that view with parameterized SQL and transactional metrics updates; the runnable local service currently scans the file-backed domain stores. Connect real identity, payment webhook proof, media CDN, rate limiting, analytics, and persistent saved searches/alerts before public launch. Demo browser storage is device-specific and does not send notifications.

Location names and divisions follow the [Bangladesh National Portal district list](https://bangladesh.gov.bd/views/district-list/). Model and grade terms come from the 9.2 catalogue.
