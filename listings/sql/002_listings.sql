-- CarBuy PRD 9.3 target PostgreSQL schema. Apply after identity/catalogue tables
-- exist. The local demo uses a JSON file; a production repository must map its
-- domain objects into these rows inside database transactions.
CREATE TABLE IF NOT EXISTS carbuy_vehicles (
  id uuid PRIMARY KEY,
  chassis_normalized text NOT NULL UNIQUE,
  registration_number_ciphertext bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (chassis_normalized ~ '^([A-Z0-9]{2,12}-[0-9]{4,8}|[A-HJ-NPR-Z0-9]{17})$')
);

CREATE TABLE IF NOT EXISTS carbuy_listings (
  id uuid PRIMARY KEY,
  vehicle_id uuid REFERENCES carbuy_vehicles(id),
  seller_id uuid NOT NULL,
  seller_type text NOT NULL CHECK (seller_type IN ('private','dealer')),
  status text NOT NULL CHECK (status IN ('draft','pending_payment','pending_review','changes_requested','live','rejected','sold','withdrawn','expired','removed')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  public_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(public_data) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  sold_via text CHECK (sold_via IN ('carbuy','elsewhere','showroom_trade_in','didnt_sell')),
  moderation_note text,
  papers_checked boolean NOT NULL DEFAULT false,
  CHECK (status <> 'live' OR (vehicle_id IS NOT NULL AND expires_at IS NOT NULL)),
  CHECK (NOT (public_data ?| ARRAY['chassisNumber','registrationNumber']))
);
CREATE UNIQUE INDEX IF NOT EXISTS carbuy_one_live_listing_per_vehicle ON carbuy_listings(vehicle_id) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS carbuy_listings_seller_status ON carbuy_listings(seller_id,status);
CREATE INDEX IF NOT EXISTS carbuy_listings_live_expiry ON carbuy_listings(expires_at) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS carbuy_listings_public_model ON carbuy_listings((public_data->>'modelId')) WHERE status = 'live';

CREATE OR REPLACE FUNCTION carbuy_enforce_private_listing_cap() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.seller_type = 'private' AND NEW.status IN ('pending_payment','pending_review','live') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.seller_id::text, 0));
    IF (SELECT count(*) FROM carbuy_listings
        WHERE seller_id = NEW.seller_id AND id <> NEW.id
          AND status IN ('pending_payment','pending_review','live')) >= 3 THEN
      RAISE EXCEPTION 'Private seller active listing limit reached';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS carbuy_private_listing_cap ON carbuy_listings;
CREATE TRIGGER carbuy_private_listing_cap BEFORE INSERT OR UPDATE OF status,seller_type,seller_id
  ON carbuy_listings FOR EACH ROW EXECUTE FUNCTION carbuy_enforce_private_listing_cap();

CREATE TABLE IF NOT EXISTS carbuy_listing_photos (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES carbuy_listings(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  webp_key text NOT NULL,
  avif_key text NOT NULL,
  sha256 text NOT NULL,
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  quality_hints text[] NOT NULL DEFAULT '{}',
  UNIQUE (listing_id,position), UNIQUE (listing_id,sha256)
);

CREATE TABLE IF NOT EXISTS carbuy_vehicle_papers (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES carbuy_listings(id) ON DELETE CASCADE,
  paper_type text NOT NULL CHECK (paper_type IN ('registration','smart_card','tax_token','fitness')),
  private_key text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz,
  checked_by uuid
);
CREATE TABLE IF NOT EXISTS carbuy_auction_sheets (
  listing_id uuid PRIMARY KEY REFERENCES carbuy_listings(id) ON DELETE CASCADE,
  private_key text NOT NULL,
  display_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('seller_provided_unverified','verification_ordered','verified')),
  grade text
);
CREATE TABLE IF NOT EXISTS carbuy_listing_orders (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  kind text NOT NULL CHECK (kind IN ('initial','renewal')),
  amount_bdt integer NOT NULL CHECK (amount_bdt >= 0),
  status text NOT NULL CHECK (status IN ('pending','paid','cancelled','refund_pending','refunded')),
  -- Listing status to restore when an unpaid checkout is cancelled.
  from_status text CHECK (from_status IN ('draft','changes_requested','expired','withdrawn')),
  gateway_reference text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS carbuy_listing_price_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES carbuy_listings(id) ON DELETE CASCADE,
  price_bdt bigint NOT NULL CHECK (price_bdt >= 10000),
  actor_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS carbuy_listing_metrics (
  listing_id uuid PRIMARY KEY REFERENCES carbuy_listings(id) ON DELETE CASCADE,
  impressions bigint NOT NULL DEFAULT 0,
  views bigint NOT NULL DEFAULT 0,
  chat bigint NOT NULL DEFAULT 0,
  call bigint NOT NULL DEFAULT 0,
  whatsapp bigint NOT NULL DEFAULT 0,
  saves bigint NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS carbuy_listing_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  actor_id text NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Default deny for client roles. A trusted backend can use a service role and
-- enforce seller/moderator identity; policies follow the 9.1 auth implementation.
ALTER TABLE carbuy_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_vehicle_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_auction_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_listing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_listing_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_listing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_listing_audit ENABLE ROW LEVEL SECURITY;
