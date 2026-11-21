# CarBuy interactive marketplace demo

Open the [public black-themed demo](https://nahid271.github.io/CarBuy_Web/preview/studio/). It runs entirely in the visitor's browser and begins with sample Bangladesh vehicle listings. Choose a persona at the top to walk through each role. Refreshing the page keeps the local demo state; **Reset demo** restores the samples.

| Persona | Working browser-local actions |
| --- | --- |
| Buyer | Search by keyword, make, city and budget; inspect details; save cars and searches; start a conversation; send messages; report a listing; see price-drop, sold and saved-search alerts. |
| Private seller | Create a draft with vehicle details, declaration and up to three small photos; submit for review; see moderation status; change a live asking price; mark a car sold; reply to demo leads. |
| Dealer | Create stock ads, submit them against free demo credits, see stock/lead/credit counts, update asking prices and answer leads. Rejected ads return their demo credit. |
| Moderator | Approve or reject pending ads with a reason, review buyer reports and remove a reported car. |

The ad lifecycle is **draft → pending → live/rejected → sold**. New ads appear to buyers only after demo approval. The shared state engine is in `shared/demo-marketplace.ts`; both `preview-app/` and `marketplace/` use it. Lifecycle and validation checks are in `platform/test/demo-marketplace.test.ts`.

## Scope and release boundary

This route is a prototype for demonstrations and feedback. Persona switching is not authentication. Browser storage is not a secure database and does not sync across people or devices. Messages and alerts do not reach another person. Uploaded photos stay in the browser; do not put identity documents, registration papers or sensitive data in it. Sample badges are not vehicle verification. Dealer credits have no monetary value, and the pricing page has hypotheses rather than checkout.

The supplied PRD stops MVP functional IDs at **9.15**. [SECTIONS-16-25.md](SECTIONS-16-25.md) records the later main PRD sections and their code, operational dependencies and open decisions. [MVP-AUDIT.md](MVP-AUDIT.md) identifies remaining gaps in 9.1–9.15 and Appendices A–B. A real launch still needs hosted data, secure user accounts, private document storage, live provider integrations, operational moderation, payment onboarding, legal review and cross-device delivery.

## Rebuild

From the repository root, run `bash scripts/build-public-preview.sh`, then commit `preview/` with the source. The export is designed for GitHub Pages at `/CarBuy_Web/preview/`.
