-- Database Schema for LottoBet (PostgreSQL / Relational)
-- Manages user authentication (username + password) and saved betslips

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Saved Betslips Table
-- Slips can be named, edited (rename, update notes, change stake/status, modify legs), and deleted
CREATE TABLE IF NOT EXISTS saved_betslips (
  id VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  booking_code VARCHAR(32),
  destination_bookie VARCHAR(32) NOT NULL DEFAULT 'sportybet:ke',
  total_odds NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  stake NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open' | 'won' | 'lost' | 'void' | 'unknown'
  notes TEXT,
  earliest_kickoff TIMESTAMPTZ,
  selections JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of SelectedPick objects
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_betslips_user_id ON saved_betslips(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_betslips_created_at ON saved_betslips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
