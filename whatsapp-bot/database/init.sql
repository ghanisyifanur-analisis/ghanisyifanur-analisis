CREATE TABLE IF NOT EXISTS inbound_messages (
  id BIGSERIAL PRIMARY KEY,
  source_app VARCHAR(100) NOT NULL DEFAULT 'unknown',
  sender_name VARCHAR(200),
  sender_phone VARCHAR(40),
  group_name VARCHAR(200),
  message TEXT NOT NULL,
  reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_messages_created_at
  ON inbound_messages (created_at DESC);
