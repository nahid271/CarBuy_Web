# CarBuy MVP 9.2–9.5 — source package

This package includes vehicle data (9.2), listings (9.3), dealers (9.4), and buyer search and discovery (9.5). Start with [search/README.md](search/README.md) for the SRC-01–SRC-11 feature map, setup, testing, and production integration notes.

Quick start with Node.js 22.18+:

```sh
cd vehicle-data && npm ci
cd ../listings && npm ci
cd ../dealers && npm ci
cd ../search && npm ci
npm run check && npm test
npm run demo
```

Visit `http://127.0.0.1:4175/` on the same computer. The buyer search demo uses fake cars and illustrated images. To use your 9.3 inventory, follow the environment-variable instructions in the search README. Do not submit real identity or payment information into the local demos.
