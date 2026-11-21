-- Stage 5. Usernames are stored lowercase so uniqueness is case-insensitive.
-- Password hashes are scrypt (format scrypt$N$r$p$salt$hash), set in src/lib/auth.ts.
ALTER TABLE users ADD CONSTRAINT users_username_lower CHECK (username = lower(username));
CREATE INDEX sessions_expires_idx ON sessions (expires_at);
