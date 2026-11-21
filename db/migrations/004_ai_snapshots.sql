-- Latest generated AI picks, shared by every server instance. Serverless instances do not share
-- memory, so picks kept in a variable were lost between requests. The app also creates this table
-- on first use (CREATE TABLE IF NOT EXISTS), so applying this file is optional but recommended.
CREATE TABLE IF NOT EXISTS ai_snapshots (
  id           bigserial PRIMARY KEY,
  run_id       text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  data         jsonb NOT NULL
);
ALTER TABLE ai_snapshots ENABLE ROW LEVEL SECURITY;
