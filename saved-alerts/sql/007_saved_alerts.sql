-- Target PostgreSQL schema for account-backed saved cars, searches and recent views.
-- app_users(id) and listings(id) are assumed to be provided by the auth/listing platform.
CREATE TABLE saved_cars (
  buyer_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  saved_price_bdt bigint NOT NULL CHECK (saved_price_bdt > 0),
  PRIMARY KEY (buyer_id, listing_id)
);
CREATE INDEX saved_cars_buyer_newest ON saved_cars (buyer_id, saved_at DESC);

CREATE TABLE recent_views (
  buyer_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_id, listing_id)
);
CREATE INDEX recent_views_buyer_newest ON recent_views (buyer_id, viewed_at DESC);

CREATE TABLE saved_search_alerts (
  id uuid PRIMARY KEY,
  buyer_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  path text NOT NULL,
  query jsonb NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('instant','daily')),
  channels text[] NOT NULL CHECK (array_length(channels, 1) BETWEEN 1 AND 2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_digest_day date,
  UNIQUE (buyer_id, path)
);
CREATE INDEX saved_search_alerts_active ON saved_search_alerts (active, created_at) WHERE active;
CREATE TABLE saved_alert_seen (
  alert_id uuid NOT NULL REFERENCES saved_search_alerts(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  pending boolean NOT NULL DEFAULT false,
  PRIMARY KEY (alert_id, listing_id)
);
CREATE TABLE saved_alert_outbox (
  id uuid PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES saved_search_alerts(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('push','email')),
  listing_ids uuid[] NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX saved_alert_outbox_unsent ON saved_alert_outbox (queued_at) WHERE status='queued';
