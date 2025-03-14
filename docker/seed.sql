-- This file creates the database tables, relationships, and indexes needed for the suggestion box
-- It follows the schema defined in src/schema.ts

-- Create extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean restarts)
DROP TABLE IF EXISTS reaction CASCADE;
DROP TABLE IF EXISTS comment CASCADE;
DROP TABLE IF EXISTS suggestion CASCADE;

-- Create suggestion table
CREATE TABLE suggestion (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    user_identifier TEXT NOT NULL
);

-- Create comment table
CREATE TABLE comment (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    suggestion_id TEXT NOT NULL REFERENCES suggestion(id) ON DELETE CASCADE,
    parent_comment_id TEXT REFERENCES comment(id) ON DELETE CASCADE,
    selection_start INTEGER,
    selection_end INTEGER,
    user_identifier TEXT NOT NULL
);

-- Create reaction table
CREATE TABLE reaction (
    id TEXT PRIMARY KEY,
    suggestion_id TEXT REFERENCES suggestion(id) ON DELETE CASCADE,
    comment_id TEXT REFERENCES comment(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    user_identifier TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    -- Ensure a reaction is attached to either a suggestion or a comment, but not both
    CONSTRAINT reaction_target_check CHECK (
        (suggestion_id IS NOT NULL AND comment_id IS NULL) OR
        (suggestion_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Add indexes for better performance

-- Indexes for suggestion table
CREATE INDEX idx_suggestion_timestamp ON suggestion(timestamp DESC);
CREATE INDEX idx_suggestion_user_identifier ON suggestion(user_identifier);

-- Indexes for comment table
CREATE INDEX idx_comment_suggestion_id ON comment(suggestion_id);
CREATE INDEX idx_comment_parent_comment_id ON comment(parent_comment_id);
CREATE INDEX idx_comment_user_identifier ON comment(user_identifier);
CREATE INDEX idx_comment_timestamp ON comment(timestamp DESC);

-- Indexes for reaction table
CREATE INDEX idx_reaction_suggestion_id ON reaction(suggestion_id);
CREATE INDEX idx_reaction_comment_id ON reaction(comment_id);
CREATE INDEX idx_reaction_user_identifier ON reaction(user_identifier);
CREATE INDEX idx_reaction_emoji ON reaction(emoji);

-- Create Zero specific tables if not automatically created

-- This table will store the Zero permissions
CREATE TABLE IF NOT EXISTS zero_permissions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
);

-- This table will store Zero's replication state 
CREATE TABLE IF NOT EXISTS zero_replication (
    id TEXT PRIMARY KEY,
    version BIGINT NOT NULL,
    data JSONB
);

-- Insert initial sample data (optional)
INSERT INTO suggestion (id, body, timestamp, user_identifier) VALUES 
('sample1', 'Welcome to the suggestion box! This is a sample suggestion.', extract(epoch from now()) * 1000, 'system');

-- Grant permissions to database user (adjust as needed for your environment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres; 