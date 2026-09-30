-- Run once using a database administrator on a separate automation database.
-- No changes to application tables or the n8n internal database are required.
CREATE SCHEMA IF NOT EXISTS youleap_finops;
CREATE TABLE IF NOT EXISTS youleap_finops.slack_dispatch (
  event_key text PRIMARY KEY,
  channel_id text NOT NULL CHECK (channel_id = 'C0C5HBL3USJ'),
  message_ts text NOT NULL,
  thread_ts text NOT NULL,
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'uncertain')),
  session_id text,
  session_url text,
  http_status integer,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Give your existing n8n automation role USAGE on this schema and
-- SELECT, INSERT, UPDATE on this table. Do not grant DROP or schema CREATE.
-- Review pending/uncertain rows before any replay:
-- SELECT * FROM youleap_finops.slack_dispatch
-- WHERE status <> 'accepted' ORDER BY created_at DESC;
-- accepted = session started, NOT proof that a Slack answer was delivered.
