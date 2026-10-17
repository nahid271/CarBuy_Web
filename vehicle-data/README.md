# CarBuy vehicle data MVP

This is the working backend module for PRD section 9.2 (`VEH-01` through `VEH-07`). It is a standalone TypeScript package because the CarBuy application and account service have not been built yet. Web and Android code can import the same functions. The local CLI lets you inspect and edit the catalogue now. A PostgreSQL store and schema are included for application integration.

## Run

Requires Node.js 22.18 or newer.

```bash
cd vehicle-data
npm install
npm test
npm run check
npm run demo -- decode NZT260-3173714
npm run demo -- registration 'Dhaka Metro-Ga 11-1234'
```

The CLI writes admin changes and mapping requests to `.local/catalog.json`. Override that location with `CARBUY_CATALOG_FILE`. This file store is for local development only; use `PostgresCatalogStore` for multiple app instances. The CLI is a trusted local tool, not a public admin endpoint. When the account module exists, the app must authenticate administrators before passing an `AdminActor` to mutation methods.

## Requirement coverage

| PRD ID | Delivered |
| --- | --- |
| VEH-01 | Make → model → generation → grade hierarchy, technical specifications, admin mutation methods, and a licensed-provider import contract. |
| VEH-02 | Curated seed of 14 named models across Toyota, Honda, and Nissan; unknown names enter an admin mapping queue. |
| VEH-03 | Japanese chassis code decoder returns make/model/generation, engine cc and known grade options. Grade is always confirmed by the seller. Shared codes return multiple candidates. |
| VEH-04 | Japanese frame and 17-character VIN format checks, Bangladesh registration format check, live-listing duplicate check, and a PostgreSQL unique index for live chassis claims. |
| VEH-05 | Bangladesh fuel and body values, drive and transmission values, and engine-cc bands. |
| VEH-06 | Bangla and English names for every seeded make, model, generation, grade, value and feature. |
| VEH-07 | 42 optional feature checklist items grouped by safety, comfort, driving, exterior, parking and infotainment. |

## Important decoder behaviour

`NZT260-3173714` is a **valid format**, but `NZT260` is used by both Toyota Allion and Toyota Premio. The result is `ambiguous` with two candidates. The seller must choose the model and then confirm the grade. Auto-selecting Premio would be an incorrect identity claim. Toyota's own [Allion](https://toyota.jp/ucar/catalog/brand-TOYOTA/car-ALLION/) and [Premio](https://toyota.jp/ucar/catalog/brand-TOYOTA/car-PREMIO/) catalogues both list `NZT260`.

The decoder matches the **prefix** against curated, sourced records. It does not prove that a full chassis serial belongs to the vehicle or that documents are genuine. Unknown codes and 17-character VINs stay in manual selection/review until a licensed data source is connected. A single representative generation and grade is seeded for each model; an administrator should expand the catalogue as verified local stock arrives. No BRTA lookup is integrated.

Manufacturer sources are stored in each chassis mapping. The seed draws on the [Toyota used-car catalogue](https://toyota.jp/ucar/catalog/), [Honda Vezel specifications](https://www.honda.co.jp/auto-archive/vezel/2018/common/pdf/vezel_spec_list.pdf), [Honda Grace specifications](https://www.honda.co.jp/auto-archive/grace/2020/common/pdf/grace_spec_list.pdf), and [Nissan X-Trail specifications](https://history.nissan.co.jp/X-TRAIL/T32/1312/PDF/x-trail_specification.pdf). The catalogue is an initial curated sample, not an exhaustive licensed vehicle database. Confirm each submitted vehicle against its paperwork before publishing a verified claim.

The seeded Vezel and Grace hybrid variants use Honda's seven-speed dual-clutch transmission, as described in Honda's [Vezel](https://www.honda.co.jp/auto-archive/vezel/2018/webcatalog/type/hybrid/) and [Grace](https://www.honda.co.jp/auto-archive/grace/2020/webcatalog/performance/driving/) archives.

## Example integration

```ts
import { CatalogService, PostgresCatalogStore } from '@carbuy/vehicle-data/server';
import { chassisFormat, duplicateLiveChassis } from '@carbuy/vehicle-data';

const catalog = new CatalogService(new PostgresCatalogStore(pgPool));
const result = await catalog.decode('NZT260-3173714');
// result.status === 'ambiguous'; show both candidate models.

const plate = chassisFormat('NHP10-1234567');
// Validate on the server again before storing a vehicle.

const collisions = duplicateLiveChassis('NHP10-1234567', liveListings);
// The listing module also needs the DB unique claim in the same publish transaction.
```

Admin edits require `{ id: 'staff-user-id', role: 'vehicle_catalog_admin' }`. `CatalogService` exposes `upsertMake`, `upsertModel`, `upsertGeneration`, `upsertGrade`, `upsertFeature`, `mappingRequests`, `resolveRequest`, and `importLicensed`. Persisted data is validated for parent references and bilingual labels.

Local CLI examples:

```bash
npm run demo -- request model 'Toyota Probox' '{"makeId":"toyota"}'
npm run demo -- admin-requests
npm run demo -- admin-upsert model '{"id":"probox","makeId":"toyota","name":{"en":"Probox","bn":"প্রোবক্স"},"aliases":[],"active":true}'
```

The SQL migration creates `vehicle_catalog_state` and `vehicle_chassis_claims`. The later listings implementation must maintain chassis claims in the same database transaction as status changes. It must also enforce seller ownership, authorisation, and private storage for full chassis/registration values.

## Boundaries

This module supplies vehicle data. Account sign-in (`9.1`), listing creation (`9.3`), papers checks (`9.9`), and admin UI (`9.14`) are separate parts of the PRD. The shared service methods and database constraint are ready for those integrations. VIN syntax validation is not a full manufacturer VIN decoder or authenticity check; plate validation checks the example structure and known class letters, not current BRTA registration status.
