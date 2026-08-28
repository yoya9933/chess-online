CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL UNIQUE,
  room_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  variant TEXT NOT NULL,
  red_name TEXT,
  black_name TEXT,
  red_token_hash TEXT,
  black_token_hash TEXT,
  winner TEXT,
  state TEXT NOT NULL,
  completed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS game_history_red_token_idx
  ON game_history(red_token_hash, completed_at DESC);
CREATE INDEX IF NOT EXISTS game_history_black_token_idx
  ON game_history(black_token_hash, completed_at DESC);
CREATE INDEX IF NOT EXISTS game_history_room_idx
  ON game_history(room_id, completed_at DESC);
