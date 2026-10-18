-- CarBuy PRD 9.5 search schema target. Apply after 002_listings.sql and
-- 003_dealers.sql. The TypeScript demo scans local stores; a production
-- SearchStore should query this public projection with parameterized SQL.

CREATE INDEX IF NOT EXISTS carbuy_search_live_make_model
  ON carbuy_listings ((public_data->>'makeId'), (public_data->>'modelId'), published_at DESC)
  WHERE status = 'live';
CREATE INDEX IF NOT EXISTS carbuy_search_live_location
  ON carbuy_listings ((public_data->>'district'), (public_data->>'area'), published_at DESC)
  WHERE status = 'live';
CREATE INDEX IF NOT EXISTS carbuy_search_live_condition_fuel_body
  ON carbuy_listings ((public_data->>'condition'), (public_data->>'fuel'), (public_data->>'body'))
  WHERE status = 'live';
CREATE INDEX IF NOT EXISTS carbuy_search_live_price
  ON carbuy_listings (((public_data->>'priceBdt')::bigint))
  WHERE status = 'live' AND (public_data->>'priceBdt') ~ '^[0-9]+$';
CREATE INDEX IF NOT EXISTS carbuy_search_live_year
  ON carbuy_listings (((public_data->>'manufactureYear')::integer))
  WHERE status = 'live' AND (public_data->>'manufactureYear') ~ '^[0-9]+$';
CREATE INDEX IF NOT EXISTS carbuy_search_live_mileage
  ON carbuy_listings (((public_data->>'mileageKm')::integer))
  WHERE status = 'live' AND (public_data->>'mileageKm') ~ '^[0-9]+$';
CREATE INDEX IF NOT EXISTS carbuy_search_live_auction
  ON carbuy_auction_sheets (status,grade) WHERE status = 'verified';

CREATE TABLE IF NOT EXISTS carbuy_listing_promotions (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES carbuy_listings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('top','featured')),
  status text NOT NULL CHECK (status IN ('pending','paid','cancelled')),
  payment_reference text UNIQUE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (status <> 'paid' OR payment_reference IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS carbuy_promotions_active
  ON carbuy_listing_promotions (starts_at,ends_at,listing_id) WHERE status = 'paid';
ALTER TABLE carbuy_listing_promotions ENABLE ROW LEVEL SECURITY;

-- Only approved live rows are exposed. Chassis, registration, seller contact,
-- paper keys, auction private key and moderation data are deliberately absent.
CREATE OR REPLACE VIEW carbuy_public_search WITH (security_invoker = true) AS
SELECT l.id,l.seller_type,l.published_at,l.expires_at,l.papers_checked,
  l.public_data->>'makeId' AS make_id,
  l.public_data->>'modelId' AS model_id,
  l.public_data->>'gradeId' AS grade_id,
  l.public_data->>'condition' AS condition,
  l.public_data->>'fuel' AS fuel,
  l.public_data->>'body' AS body,
  l.public_data->>'transmission' AS transmission,
  l.public_data->>'district' AS district,
  l.public_data->>'area' AS area,
  l.public_data->>'colour' AS colour,
  (l.public_data->>'priceBdt')::bigint AS price_bdt,
  (l.public_data->>'manufactureYear')::integer AS manufacture_year,
  NULLIF(l.public_data->>'registrationYear','')::integer AS registration_year,
  (l.public_data->>'mileageKm')::integer AS mileage_km,
  (l.public_data->>'engineCc')::integer AS engine_cc,
  photo.webp_key AS cover_key,
  (auction.status = 'verified') AS auction_verified,
  CASE WHEN auction.status = 'verified' THEN auction.grade ELSE NULL END AS auction_grade,
  (dealer.verified_at IS NOT NULL) AS verified_dealer
FROM carbuy_listings l
LEFT JOIN LATERAL (
  SELECT webp_key FROM carbuy_listing_photos WHERE listing_id = l.id ORDER BY position LIMIT 1
) photo ON true
LEFT JOIN carbuy_auction_sheets auction ON auction.listing_id = l.id
LEFT JOIN carbuy_dealer_orgs dealer ON l.seller_type = 'dealer' AND dealer.id = l.seller_id
WHERE l.status = 'live' AND l.expires_at > now()
  AND l.public_data ?& ARRAY['makeId','modelId','gradeId','condition','priceBdt',
    'manufactureYear','mileageKm','engineCc','fuel','body','transmission','district','area']
  AND (l.public_data->>'priceBdt') ~ '^[0-9]+$'
  AND (l.public_data->>'manufactureYear') ~ '^[0-9]+$'
  AND (l.public_data->>'mileageKm') ~ '^[0-9]+$'
  AND (l.public_data->>'engineCc') ~ '^[0-9]+$';
REVOKE ALL ON carbuy_public_search FROM PUBLIC;
