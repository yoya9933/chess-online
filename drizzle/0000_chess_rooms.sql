CREATE TABLE IF NOT EXISTS rooms (
  room_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  red_token TEXT,
  red_name TEXT,
  red_seen INTEGER,
  black_token TEXT,
  black_name TEXT,
  black_seen INTEGER,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rooms_updated_at_idx ON rooms(updated_at);
