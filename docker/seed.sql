CREATE TABLE category (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    background_color TEXT NOT NULL
);

-- Insert default categories
INSERT INTO category (id, name, description, background_color) VALUES 
('start', 'Start', 'Things we should start doing', '#BEE1Ce'),
('stop', 'Stop', 'Things we should stop doing', '#e4bfcf'),
('continue', 'Continue', 'Things we should continue doing', '#c3d2db');

CREATE TABLE suggestion (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT,
    category_id TEXT NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ
);

CREATE TABLE comment (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    suggestion_id TEXT NOT NULL REFERENCES suggestion(id) ON DELETE CASCADE,
    parent_comment_id TEXT REFERENCES comment(id) ON DELETE CASCADE,
    selection_start INTEGER,
    selection_end INTEGER,
    user_id TEXT NOT NULL,
    display_name TEXT,
    is_root_comment BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE reaction (
    id TEXT PRIMARY KEY,
    suggestion_id TEXT REFERENCES suggestion(id) ON DELETE CASCADE,
    comment_id TEXT REFERENCES comment(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    user_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    -- Ensure a reaction is attached to either a suggestion or a comment, but not both
    CONSTRAINT reaction_target_check CHECK (
        (suggestion_id IS NOT NULL AND comment_id IS NULL) OR
        (suggestion_id IS NULL AND comment_id IS NOT NULL)
    )
);

CREATE INDEX idx_suggestion_timestamp ON suggestion(timestamp DESC);
CREATE INDEX idx_suggestion_user_id ON suggestion(user_id);
CREATE INDEX idx_suggestion_category_id ON suggestion(category_id);

CREATE INDEX idx_comment_suggestion_id ON comment(suggestion_id);
CREATE INDEX idx_comment_parent_comment_id ON comment(parent_comment_id);
CREATE INDEX idx_comment_user_id ON comment(user_id);
CREATE INDEX idx_comment_timestamp ON comment(timestamp DESC);

CREATE INDEX idx_reaction_suggestion_id ON reaction(suggestion_id);
CREATE INDEX idx_reaction_comment_id ON reaction(comment_id);
CREATE INDEX idx_reaction_user_id ON reaction(user_id);
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
    avatar_url TEXT,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ
);

CREATE TABLE session (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMPTZ,
    started_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    ended_at TIMESTAMPTZ,
    users JSONB,
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_session_started_at ON session(started_at DESC);
CREATE INDEX idx_session_started_by ON session(started_by);

-- updated_at triggers
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_updated_at
BEFORE UPDATE ON session
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suggestion_updated_at
BEFORE UPDATE ON suggestion
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_updated_at
BEFORE UPDATE ON "user"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();