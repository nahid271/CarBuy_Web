-- CarBuy vehicle data MVP. Apply with a database migration tool before wiring
-- PostgresCatalogStore. No grants to anonymous or public roles are created.
CREATE TABLE IF NOT EXISTS vehicle_catalog_state (
  id smallint PRIMARY KEY CHECK (id = 1),
  version bigint NOT NULL CHECK (version >= 1),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The listing module (9.3) should create/delete claims within the same DB
-- transaction as publishing, unpublishing, or selling a listing. The partial
-- unique index is the authoritative guard against two live ads for one frame.
CREATE TABLE IF NOT EXISTS vehicle_chassis_claims (
  listing_id uuid PRIMARY KEY,
  chassis_normalized text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','pending_review','live','sold','withdrawn','expired','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (chassis_normalized ~ '^([A-Z0-9]{2,12}-[0-9]{4,8}|[A-HJ-NPR-Z0-9]{17})$')
);
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_one_live_chassis
  ON vehicle_chassis_claims (chassis_normalized) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS vehicle_claims_lookup
  ON vehicle_chassis_claims (chassis_normalized);
