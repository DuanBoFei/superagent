-- Migration 001: Session History Schema Extension
-- Feature: 032-web-session-history-sidebar
-- Adds metadata columns, tags, FTS5 search, and indexes to sessions table

-- Session table extensions
ALTER TABLE sessions ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE sessions ADD COLUMN duration_ms INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN tool_call_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN message_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN forked_from TEXT REFERENCES sessions(id);
ALTER TABLE sessions ADD COLUMN forked_at_message_index INTEGER;
ALTER TABLE sessions ADD COLUMN messages_content TEXT NOT NULL DEFAULT '';

-- Tags junction table
CREATE TABLE IF NOT EXISTS session_tags (
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, tag)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_title ON sessions(title);
CREATE INDEX IF NOT EXISTS idx_session_tags_tag ON session_tags(tag);

-- FTS5 virtual table for full-text search (standalone, synced via triggers)
CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
  session_id UNINDEXED,
  title,
  messages_content,
  tokenize='porter unicode61'
);

-- Triggers to keep FTS table in sync with sessions
CREATE TRIGGER IF NOT EXISTS sessions_fts_ai AFTER INSERT ON sessions BEGIN
  INSERT INTO sessions_fts(session_id, title, messages_content)
  VALUES (new.id, new.title, COALESCE(new.messages_content, ''));
END;

CREATE TRIGGER IF NOT EXISTS sessions_fts_au AFTER UPDATE ON sessions BEGIN
  DELETE FROM sessions_fts WHERE session_id = old.id;
  INSERT INTO sessions_fts(session_id, title, messages_content)
  VALUES (new.id, new.title, COALESCE(new.messages_content, ''));
END;

CREATE TRIGGER IF NOT EXISTS sessions_fts_ad AFTER DELETE ON sessions BEGIN
  DELETE FROM sessions_fts WHERE session_id = old.id;
END;
