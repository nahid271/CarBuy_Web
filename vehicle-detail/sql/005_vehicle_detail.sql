-- CarBuy PRD 9.6 target schema. Apply after 001–004.
-- The local demo uses an in-memory or single-process JSON activity store.
ALTER TABLE carbuy_auction_sheets ADD COLUMN IF NOT EXISTS mileage_km integer
  CHECK (mileage_km BETWEEN 0 AND 1000000);

CREATE TABLE IF NOT EXISTS carbuy_detail_leads (
  id uuid PRIMARY KEY, listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  buyer_id uuid NOT NULL, channel text NOT NULL CHECK (channel IN ('chat','call','whatsapp')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carbuy_detail_leads_listing_date ON carbuy_detail_leads(listing_id,created_at DESC);

CREATE TABLE IF NOT EXISTS carbuy_chassis_reveals (
  id uuid PRIMARY KEY, listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  buyer_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carbuy_chassis_reveals_listing_date ON carbuy_chassis_reveals(listing_id,created_at DESC);

CREATE TABLE IF NOT EXISTS carbuy_detail_reports (
  id uuid PRIMARY KEY, listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  buyer_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('suspected_scam','incorrect_details','sold_elsewhere','other')),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carbuy_detail_reports_queue ON carbuy_detail_reports(status,created_at);

CREATE TABLE IF NOT EXISTS carbuy_auction_verification_orders (
  id uuid PRIMARY KEY, listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  buyer_id uuid NOT NULL, amount_bdt integer NOT NULL CHECK (amount_bdt > 0),
  status text NOT NULL CHECK (status IN ('pending','paid')),
  gateway_reference text UNIQUE, checkout_url text,
  created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS carbuy_one_paid_auction_request
  ON carbuy_auction_verification_orders(listing_id) WHERE status = 'paid';
CREATE INDEX IF NOT EXISTS carbuy_auction_verification_queue
  ON carbuy_auction_verification_orders(status,paid_at);

-- Keep lead identities, chassis access, reports and payment rows behind the
-- trusted backend. Add narrow policies only after 9.1 identity is connected.
ALTER TABLE carbuy_detail_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_chassis_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_detail_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_auction_verification_orders ENABLE ROW LEVEL SECURITY;
