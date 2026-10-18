# CarBuy MVP 9.2–9.7 — source package

This package includes vehicle data (9.2), listings (9.3), dealers (9.4), buyer search and discovery (9.5), the vehicle detail page (9.6), and messaging and leads (9.7). Start with [messaging/README.md](messaging/README.md) for the MSG-01–MSG-09 feature map, setup, testing, and production integration notes.

Quick start with Node.js 22.18+:

```sh
cd vehicle-data && npm ci
cd ../listings && npm ci
cd ../dealers && npm ci
cd ../search && npm ci
cd ../vehicle-detail && npm ci
cd ../messaging && npm ci
npm run check && npm test
npm run demo
```

Visit `http://127.0.0.1:4175/car/demo-car-001` and tap Chat. Open `http://127.0.0.1:4175/seller-inbox` in another tab to answer as the fake private seller. The buyer demo uses fake cars and illustrated images; notifications are queued locally and never sent. To use your 9.3 inventory, follow the environment-variable instructions in the search README. Do not submit real identity or payment information into the local demos.
