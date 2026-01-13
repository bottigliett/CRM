-- Migration: Fix token column size limitation
-- This migration changes the token column from VARCHAR(500) to TEXT
-- and adds a token_hash column for fast, secure lookups

-- Step 1: Drop ALL indexes on token column (both unique and regular)
-- Try to drop unique constraint first (might not exist)
ALTER TABLE user_sessions DROP INDEX IF EXISTS token;
-- Try to drop regular index (might exist from @@index)
ALTER TABLE user_sessions DROP INDEX IF EXISTS user_sessions_token_idx;

-- Step 2: Change token column to TEXT (unlimited size)
ALTER TABLE user_sessions MODIFY COLUMN token TEXT;

-- Step 3: Add token_hash column as VARCHAR(64) for SHA-256 hash
ALTER TABLE user_sessions ADD COLUMN token_hash VARCHAR(64) NULL;

-- Step 4: Create UNIQUE index on token_hash
ALTER TABLE user_sessions ADD UNIQUE INDEX token_hash (token_hash);
