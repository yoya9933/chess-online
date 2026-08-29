CREATE TABLE IF NOT EXISTS position_log (
  room_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  position_key TEXT NOT NULL,
  mover TEXT NOT NULL,
  gives_check INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, revision)
);

CREATE INDEX IF NOT EXISTS position_log_room_key_idx
ON position_log(room_id, position_key, revision);
