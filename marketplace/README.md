# CarBuy black-themed marketplace preview

This is Toufiq's Next.js storefront, connected to the CarBuy sample inventory service in `../search`. It offers a dark default theme, search and filters, car detail pages, and safety/content guides. All cars, sellers, payments and trust badges in the local preview are **sample data**. The preview is deliberately marked `noindex`.

Use Node.js 22.18+ (Node.js 24 recommended). From the repository root, open two terminals:

```sh
cd search
npm ci
npm run demo
```

```sh
cd marketplace
npm ci
CARBUY_API_URL=http://127.0.0.1:4175 npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open <http://127.0.0.1:3001/>. The inventory module is available at <http://127.0.0.1:4175/>. The seller studio and dealer portal can be started separately from `../listings` and `../dealers`; the guide pages link to their localhost ports 4173 and 4174.

`npm run build` verifies the storefront. Run `npm run check && npm test` inside each TypeScript service directory. See [MVP-STATUS.md](../MVP-STATUS.md) for requirement-by-requirement implementation status and production blockers.

The storefront currently calls the local inventory service from server-side requests. A public deployment requires a hosted API and database, real identity and payment providers, secure admin access, and removal of the demo banner/noindex setting after real data is ready.
