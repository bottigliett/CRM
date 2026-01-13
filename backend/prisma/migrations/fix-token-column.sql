-- Migration: Fix token column size limitation
-- This migration changes the token column from VARCHAR(500) to TEXT
-- and adds a token_hash column for fast, secure lookups

-- Step 1: Drop the existing UNIQUE constraint on token column
ALTER TABLE user_sessions DROP INDEX token;

-- Step 2: Change token column to TEXT (unlimited size)
ALTER TABLE user_sessions MODIFY COLUMN token TEXT;

-- Step 3: Add token_hash column as VARCHAR(64) for SHA-256 hash
ALTER TABLE user_sessions ADD COLUMN token_hash VARCHAR(64) NULL;

-- Step 4: Add UNIQUE index on token_hash
-- Note: We create index first, then add UNIQUE constraint separately to avoid errors
CREATE INDEX idx_token_hash ON user_sessions(token_hash);

-- Step 5: Make token_hash column UNIQUE (after index is created)
-- Note: This will be enforced at application level until all tokens are migrated
-- Once all sessions have token_hash populated, we can add the UNIQUE constraint:
-- ALTER TABLE user_sessions ADD UNIQUE INDEX idx_token_hash_unique (token_hash);
