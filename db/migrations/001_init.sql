-- No seed data. Every row comes from real fetches or real user actions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,           -- argon2id/bcrypt hash, never plaintext
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fetch_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('daily','lineup_refresh','manual')),
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  results     jsonb NOT NULL DEFAULT '{}'    -- per-upstream ok/error/httpStatus
);

CREATE TABLE games (
  id              text NOT NULL,             -- '<bookmaker>:<nativeEventId>'
  fetch_run_id    uuid NOT NULL REFERENCES fetch_runs(id),
  bookmaker       text NOT NULL CHECK (bookmaker IN ('sportybet','betpawa')),
  native_event_id text NOT NULL,
  home            text NOT NULL,
  away            text NOT NULL,
  kickoff         timestamptz NOT NULL,
  league          text,
  markets         jsonb NOT NULL,            -- normalized Market[] (each carries bookmaker)
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, fetch_run_id)
);
CREATE INDEX games_kickoff_idx ON games (kickoff);

CREATE TABLE game_matches (
  fetch_run_id    uuid NOT NULL REFERENCES fetch_runs(id),
  sporty_game_id  text NOT NULL,
  betpawa_game_id text NOT NULL,
  score           numeric(5,4) NOT NULL,
  PRIMARY KEY (fetch_run_id, sporty_game_id, betpawa_game_id)
);

CREATE TABLE ai_slip_batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fetch_run_id uuid NOT NULL REFERENCES fetch_runs(id),
  kind         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE slips (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,   -- NULL for AI slips
  batch_id     uuid REFERENCES ai_slip_batches(id),
  destination  text CHECK (destination IN ('sportybet','betpawa')),
  booking_code text,
  total_odds   numeric(14,4) NOT NULL,
  selections   jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','void','unsettleable')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  settled_at   timestamptz
);

CREATE TABLE picks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_id          uuid NOT NULL REFERENCES slips(id) ON DELETE CASCADE,
  game_id          text NOT NULL,
  market_key       text NOT NULL,
  tier             text NOT NULL CHECK (tier IN ('safe','balanced','value')),
  odds             numeric(8,3) NOT NULL,
  implied_prob     numeric(6,5),
  criteria_results jsonb NOT NULL,           -- per criterion: pass | fail | unavailable
  criteria_verified int NOT NULL,
  criteria_total    int NOT NULL,
  result           text CHECK (result IN ('won','lost','void','cannot_be_settled'))
);

CREATE TABLE community_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slip_id    uuid REFERENCES slips(id) ON DELETE SET NULL,
  caption    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
