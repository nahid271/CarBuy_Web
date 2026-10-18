-- CarBuy PRD 9.7 target schema. Apply after migrations 001–005.
-- The local demo uses an in-memory or single-process JSON store.
CREATE TABLE IF NOT EXISTS carbuy_conversations (
  id uuid PRIMARY KEY, listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  buyer_id uuid NOT NULL, seller_id uuid NOT NULL,
  blocked_by uuid[] NOT NULL DEFAULT '{}',
  last_seller_opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id,buyer_id),CHECK(buyer_id <> seller_id)
);
CREATE INDEX IF NOT EXISTS carbuy_conversations_buyer ON carbuy_conversations(buyer_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS carbuy_conversations_seller ON carbuy_conversations(seller_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS carbuy_chat_attachments (
  id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES carbuy_conversations(id),
  uploader_id uuid NOT NULL,private_key text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK(mime_type='image/webp'),created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carbuy_messages (
  id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES carbuy_conversations(id),
  sender_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('text','image')),
  body text NOT NULL DEFAULT '' CHECK(length(body)<=2000),
  attachment_id uuid REFERENCES carbuy_chat_attachments(id),
  risk text NOT NULL CHECK(risk IN ('clear','warn','held')),
  risk_reasons text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carbuy_messages_thread_date ON carbuy_messages(conversation_id,created_at,id);
CREATE INDEX IF NOT EXISTS carbuy_messages_held_queue ON carbuy_messages(created_at) WHERE risk='held';

CREATE TABLE IF NOT EXISTS carbuy_message_leads (
  id uuid PRIMARY KEY,listing_id uuid NOT NULL REFERENCES carbuy_listings(id),
  buyer_id uuid NOT NULL,seller_id uuid NOT NULL,
  channel text NOT NULL CHECK(channel IN ('chat','call','whatsapp')),
  conversation_id uuid REFERENCES carbuy_conversations(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carbuy_message_leads_seller_date ON carbuy_message_leads(seller_id,created_at DESC);

CREATE TABLE IF NOT EXISTS carbuy_conversation_reports (
  id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES carbuy_conversations(id),
  reporter_id uuid NOT NULL,reason text NOT NULL CHECK(reason IN ('scam','abuse','spam','other')),
  note text NOT NULL DEFAULT '' CHECK(length(note)<=1000),
  status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carbuy_conversation_reports_queue ON carbuy_conversation_reports(status,created_at);

CREATE TABLE IF NOT EXISTS carbuy_message_notifications (
  id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES carbuy_conversations(id),
  recipient_id uuid NOT NULL,channel text NOT NULL CHECK(channel IN ('push','sms','email')),
  status text NOT NULL CHECK(status IN ('queued','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carbuy_message_notifications_pending ON carbuy_message_notifications(created_at) WHERE status='queued';

-- No client policies here: participant checks, held-message visibility, image
-- authorization and notification delivery belong in a trusted backend.
ALTER TABLE carbuy_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_message_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_conversation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbuy_message_notifications ENABLE ROW LEVEL SECURITY;
