DROP TRIGGER IF EXISTS preserve_users_created_at ON "user";

DROP TRIGGER IF EXISTS preserve_action_items_created_at ON action_item;

DROP TRIGGER IF EXISTS preserve_suggestions_timestamp ON suggestion;

DROP TRIGGER IF EXISTS preserve_comments_timestamp ON comment;

DROP TRIGGER IF EXISTS preserve_reactions_timestamp ON reaction;

DROP TRIGGER IF EXISTS preserve_sessions_started_at ON session;

CREATE
OR REPLACE FUNCTION preserve_timestamp_field() RETURNS TRIGGER AS $ $ DECLARE column_name text := TG_ARGV [0];

BEGIN -- Use dynamic SQL to check if the column exists and has a value
IF column_name = 'created_at'
AND OLD.created_at IS NOT NULL THEN NEW.created_at = OLD.created_at;

ELSIF column_name = 'timestamp'
AND OLD.timestamp IS NOT NULL THEN NEW.timestamp = OLD.timestamp;

ELSIF column_name = 'started_at'
AND OLD.started_at IS NOT NULL THEN NEW.started_at = OLD.started_at;

END IF;

RETURN NEW;

END;

$ $ LANGUAGE plpgsql;

-- Apply triggers only to tables with the relevant columns
CREATE TRIGGER preserve_users_created_at BEFORE
UPDATE
    ON "user" FOR EACH ROW EXECUTE FUNCTION preserve_timestamp_field('created_at');

CREATE TRIGGER preserve_action_items_created_at BEFORE
UPDATE
    ON action_item FOR EACH ROW EXECUTE FUNCTION preserve_timestamp_field('created_at');

CREATE TRIGGER preserve_suggestions_timestamp BEFORE
UPDATE
    ON suggestion FOR EACH ROW EXECUTE FUNCTION preserve_timestamp_field('timestamp');

CREATE TRIGGER preserve_comments_timestamp BEFORE
UPDATE
    ON comment FOR EACH ROW EXECUTE FUNCTION preserve_timestamp_field('timestamp');

CREATE TRIGGER preserve_reactions_timestamp BEFORE
UPDATE
    ON reaction FOR EACH ROW EXECUTE FUNCTION preserve_timestamp_field('timestamp');

CREATE TRIGGER preserve_sessions_started_at BEFORE
UPDATE
    ON session FOR EACH ROW EXECUTE FUNCTION preserve_timestamp_field('started_at');