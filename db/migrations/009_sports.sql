-- Migration 009_sports: multi-sport support (tennis, basketball).
-- FLAGGED FOR HUMAN REVIEW — review before applying to production.
ALTER TABLE games ADD COLUMN sport text NOT NULL DEFAULT 'football';
CREATE INDEX idx_games_sport ON games (sport);
