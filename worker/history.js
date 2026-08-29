function hex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function tokenHash(token) {
  const value = String(token || '');
  if (!value) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return hex(digest);
}

export async function recordCompletedGame(db, roomId) {
  if (!db || !roomId) return false;
  const room = await db.prepare('SELECT * FROM rooms WHERE room_id = ?').bind(roomId).first();
  if (!room) return false;

  let state;
  try {
    state = JSON.parse(room.state);
  } catch {
    return false;
  }
  if (!state?.winner && !state?.result?.finished) return false;

  const revision = Number(room.revision || 0);
  const gameId = `${room.room_id}:${revision}`;
  const [redTokenHash, blackTokenHash] = await Promise.all([
    tokenHash(room.red_token),
    tokenHash(room.black_token),
  ]);
  const completedAt = Date.now();
  const storedWinner = state.winner || (state.result?.finished ? 'draw' : null);

  const result = await db.prepare(`
    INSERT OR IGNORE INTO game_history (
      game_id, room_id, revision, variant, red_name, black_name,
      red_token_hash, black_token_hash, winner, state, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    gameId,
    room.room_id,
    revision,
    state.variant || 'standard',
    room.red_name || '紅方',
    room.black_name || '黑方',
    redTokenHash,
    blackTokenHash,
    storedWinner,
    room.state,
    completedAt,
  ).run();

  return Boolean(result.meta?.changes);
}

function publicHistoryRow(row) {
  let state = null;
  try {
    state = JSON.parse(row.state);
  } catch {}
  return {
    gameId: row.game_id,
    roomId: row.room_id,
    revision: Number(row.revision || 0),
    variant: row.variant || 'standard',
    redName: row.red_name || '紅方',
    blackName: row.black_name || '黑方',
    winner: row.winner || state?.winner || null,
    result: state?.result || null,
    state,
    completedAt: Number(row.completed_at || 0),
  };
}

export async function handleHistory(request, env) {
  if (!env?.DB) return Response.json({ error: 'DB binding is unavailable' }, { status: 500 });
  const token = String(request.headers.get('X-Player-Token') || '');
  const hash = await tokenHash(token);
  if (!hash) return Response.json({ error: '玩家憑證無效' }, { status: 401 });

  const result = await env.DB.prepare(`
    SELECT game_id, room_id, revision, variant, red_name, black_name, winner, state, completed_at
    FROM game_history
    WHERE red_token_hash = ? OR black_token_hash = ?
    ORDER BY completed_at DESC
    LIMIT 20
  `).bind(hash, hash).all();

  return Response.json({ games: (result.results || []).map(publicHistoryRow) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
