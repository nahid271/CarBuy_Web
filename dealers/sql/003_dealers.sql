-- CarBuy PRD 9.4 target PostgreSQL schema. Apply after 002_listings.sql.
-- Local demo uses JSON stores. Production adapters must use one database
-- transaction for credit debit, listing order and listing status transitions.
CREATE TABLE IF NOT EXISTS carbuy_dealer_applications (
  id uuid PRIMARY KEY,
  applicant_user_id uuid NOT NULL,
  showroom_name text NOT NULL,
  trade_licence_number text NOT NULL,
  tin text NOT NULL,
  owner_nid_ciphertext bytea NOT NULL,
  address text NOT NULL,
  district text NOT NULL,
  phones text[] NOT NULL CHECK (cardinality(phones) BETWEEN 1 AND 3),
  whatsapp text NOT NULL,
  logo_key text NOT NULL,
  barvida_membership text,
  hours text NOT NULL,
  about text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending','verified','rejected')),
  review_method text CHECK (review_method IN ('visit','video_call')),
  reviewer_id uuid,
  review_note text,
  reviewed_at timestamptz,
  org_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS carbuy_dealer_active_trade_licence
  ON carbuy_dealer_applications(lower(trade_licence_number)) WHERE status <> 'rejected';
CREATE UNIQUE INDEX IF NOT EXISTS carbuy_dealer_one_pending_application
  ON carbuy_dealer_applications(applicant_user_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS carbuy_dealer_orgs (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL UNIQUE REFERENCES carbuy_dealer_applications(id),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  address text NOT NULL,
  district text NOT NULL,
  phones text[] NOT NULL CHECK (cardinality(phones) BETWEEN 1 AND 3),
  whatsapp text NOT NULL,
  logo_key text NOT NULL,
  hours text NOT NULL,
  about text NOT NULL DEFAULT '',
  verified_at timestamptz NOT NULL,
  verification_method text NOT NULL CHECK (verification_method IN ('visit','video_call')),
  auto_renew boolean NOT NULL DEFAULT false,
  starter_granted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='carbuy_dealer_application_org_fk') THEN
    ALTER TABLE carbuy_dealer_applications ADD CONSTRAINT carbuy_dealer_application_org_fk
      FOREIGN KEY (org_id) REFERENCES carbuy_dealer_orgs(id) DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS carbuy_dealer_members (
  org_id uuid NOT NULL REFERENCES carbuy_dealer_orgs(id),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','manager','sales')),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  push_token text,
  push_enabled boolean NOT NULL DEFAULT true,
  sms_opt_in boolean NOT NULL DEFAULT false,
  email_opt_in boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (org_id,user_id)
);
CREATE INDEX IF NOT EXISTS carbuy_dealer_members_user ON carbuy_dealer_members(user_id) WHERE active;

CREATE TABLE IF NOT EXISTS carbuy_dealer_credit_purchases (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES carbuy_dealer_orgs(id),
  pack_id text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  amount_bdt integer NOT NULL CHECK (amount_bdt >= 0),
  method text NOT NULL CHECK (method IN ('bkash','nagad','card')),
  status text NOT NULL CHECK (status IN ('pending','paid')),
  gateway_reference text UNIQUE,
  checkout_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS carbuy_dealer_credit_ledger (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES carbuy_dealer_orgs(id),
  delta integer NOT NULL CHECK (delta <> 0),
  reason text NOT NULL CHECK (reason IN ('starter','pack','listing','renewal','refund','admin')),
  reference text NOT NULL,
  listing_id uuid REFERENCES carbuy_listings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id,reason,reference)
);
CREATE INDEX IF NOT EXISTS carbuy_dealer_ledger_balance ON carbuy_dealer_credit_ledger(org_id,created_at);
CREATE OR REPLACE VIEW carbuy_dealer_credit_balances AS
  SELECT org_id,COALESCE(sum(delta),0)::integer AS balance FROM carbuy_dealer_credit_ledger GROUP BY org_id;

CREATE TABLE IF NOT EXISTS carbuy_dealer_stock (
  listing_id uuid PRIMARY KEY REFERENCES carbuy_listings(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES carbuy_dealer_orgs(id),
  stock_number text NOT NULL CHECK (stock_number ~ '^[A-Za-z0-9_-]{1,32}$'),
  stock_status text NOT NULL CHECK (stock_status IN ('ready','preorder')),
  expected_arrival date,
  after_sales_notes text CHECK (length(after_sales_notes) <= 2000),
  UNIQUE (org_id,stock_number),
  CHECK (stock_status <> 'preorder' OR expected_arrival IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS carbuy_dealer_stock_org ON carbuy_dealer_stock(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS carbuy_dealer_stock_number_casefold ON carbuy_dealer_stock(org_id,lower(stock_number));

CREATE TABLE IF NOT EXISTS carbuy_dealer_leads (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES carbuy_dealer_orgs(id),
  listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  buyer_id uuid NOT NULL,
  first_channel text NOT NULL CHECK (first_channel IN ('chat','call','whatsapp')),
  status text NOT NULL CHECK (status IN ('new','contacted','qualified','closed')),
  assignee_user_id uuid,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS carbuy_dealer_one_open_lead ON carbuy_dealer_leads(org_id,listing_id,buyer_id) WHERE status <> 'closed';
CREATE INDEX IF NOT EXISTS carbuy_dealer_leads_inbox ON carbuy_dealer_leads(org_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS carbuy_dealer_lead_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES carbuy_dealer_leads(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('chat','call','whatsapp')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carbuy_dealer_notifications (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES carbuy_dealer_orgs(id),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('lead','low_credit')),
  channel text NOT NULL CHECK (channel IN ('push','sms','email')),
  body text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS carbuy_dealer_audit (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES carbuy_dealer_orgs(id),
  application_id uuid REFERENCES carbuy_dealer_applications(id),
  actor_id text NOT NULL,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carbuy_dealer_audit_org ON carbuy_dealer_audit(org_id,created_at DESC);

-- Client roles have no direct access until 9.1 authentication adds scoped
-- policies. Never give client credentials the service-role connection.
ALTER TABLE carbuy_dealer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_dealer_audit ENABLE ROW LEVEL SECURITY;
