# CarBuy MVP 9.2–9.8 — source package

This package includes vehicle data (9.2), listings (9.3), dealers (9.4), buyer search and discovery (9.5), the vehicle detail page (9.6), messaging and leads (9.7), and saved cars and alerts (9.8). Start with [saved-alerts/README.md](saved-alerts/README.md) for the SAV-01–SAV-05 feature map, setup, testing, and production integration notes.

Quick start with Node.js 22.18+:

```sh
cd vehicle-data && npm ci
cd ../listings && npm ci
cd ../dealers && npm ci
cd ../search && npm ci
cd ../vehicle-detail && npm ci
cd ../messaging && npm ci
cd ../saved-alerts && npm ci
cd ../search
npm run check && npm test
npm run demo
```

Visit `http://127.0.0.1:4175/car/demo-car-001` and tap Save, then open `http://127.0.0.1:4175/saved` to manage cars and alerts. The buyer demo uses fake cars and illustrated images; notifications are queued locally and never sent. To use your 9.3 inventory, follow the environment-variable instructions in the search README. Do not submit real identity or payment information into the local demos.
