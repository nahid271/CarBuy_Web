# CarBuy MVP 9.2–9.6 — source package

This package includes vehicle data (9.2), listings (9.3), dealers (9.4), buyer search and discovery (9.5), and the vehicle detail page (9.6). Start with [vehicle-detail/README.md](vehicle-detail/README.md) for the VDP-01–VDP-14 feature map, setup, testing, and production integration notes.

Quick start with Node.js 22.18+:

```sh
cd vehicle-data && npm ci
cd ../listings && npm ci
cd ../dealers && npm ci
cd ../search && npm ci
cd ../vehicle-detail && npm ci
npm run check && npm test
npm run demo
```

Visit `http://127.0.0.1:4175/` and open a car, or go directly to `http://127.0.0.1:4175/car/demo-car-001`. The buyer demo uses fake cars and illustrated images. To use your 9.3 inventory, follow the environment-variable instructions in the search README. Do not submit real identity or payment information into the local demos.
