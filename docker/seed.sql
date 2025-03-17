CREATE TABLE category (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    background_color TEXT NOT NULL
);

-- Insert default categories
INSERT INTO category (id, name, description) VALUES 
('start', 'Start', 'Things we should start doing'),
('stop', 'Stop', 'Things we should stop doing'),
('continue', 'Continue', 'Things we should continue doing');

CREATE TABLE suggestion (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    user_identifier TEXT NOT NULL,
    display_name TEXT,
    category_id TEXT NOT NULL REFERENCES category(id) ON DELETE CASCADE
);

CREATE TABLE comment (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    suggestion_id TEXT NOT NULL REFERENCES suggestion(id) ON DELETE CASCADE,
    parent_comment_id TEXT REFERENCES comment(id) ON DELETE CASCADE,
    selection_start INTEGER,
    selection_end INTEGER,
    user_identifier TEXT NOT NULL,
    display_name TEXT,
    is_root_comment BOOLEAN NOT NULL DEFAULT FALSE
);

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

CREATE INDEX idx_suggestion_timestamp ON suggestion(timestamp DESC);
CREATE INDEX idx_suggestion_user_identifier ON suggestion(user_identifier);
CREATE INDEX idx_suggestion_category_id ON suggestion(category_id);

CREATE INDEX idx_comment_suggestion_id ON comment(suggestion_id);
CREATE INDEX idx_comment_parent_comment_id ON comment(parent_comment_id);
CREATE INDEX idx_comment_user_identifier ON comment(user_identifier);
CREATE INDEX idx_comment_timestamp ON comment(timestamp DESC);

CREATE INDEX idx_reaction_suggestion_id ON reaction(suggestion_id);
CREATE INDEX idx_reaction_comment_id ON reaction(comment_id);
CREATE INDEX idx_reaction_user_identifier ON reaction(user_identifier);
CREATE INDEX idx_reaction_emoji ON reaction(emoji);

CREATE TABLE IF NOT EXISTS zero_permissions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS zero_replication (
    id TEXT PRIMARY KEY,
    version BIGINT NOT NULL,
    data JSONB
);

CREATE TABLE "user" (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT
);

CREATE TABLE session (
    id TEXT PRIMARY KEY,
    started_at BIGINT NOT NULL,
    started_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX idx_session_started_at ON session(started_at DESC);
CREATE INDEX idx_session_started_by ON session(started_by);