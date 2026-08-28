const ONLINE_WINDOW_MS = 45_000;
const SEAT_TTL_MS = 120_000;
const HEARTBEAT_WRITE_INTERVAL_MS = 30_000;
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cleanRoomId(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function presenceState(seenAt, now = Date.now()) {
  const seen = Number(seenAt || 0);
  if (!seen || now - seen > SEAT_TTL_MS) return 'expired';
  if (now - seen > ONLINE_WINDOW_MS) return 'offline';
  return 'online';
}

async function readRequestIdentity(request, fallbackRoomId = '') {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    return {
      roomId: cleanRoomId(url.searchParams.get('room') || fallbackRoomId),
      token: String(request.headers.get('X-Player-Token') || '').slice(0, 80),
    };
  }
  try {
    const body = await request.json();
    return {
      roomId: cleanRoomId(body.roomId || fallbackRoomId),
      token: String(request.headers.get('X-Player-Token') || body.token || '').slice(0, 80),
    };
  } catch {
    return { roomId: cleanRoomId(fallbackRoomId), token: String(request.headers.get('X-Player-Token') || '').slice(0, 80) };
  }
}

async function getRoom(db, roomId) {
  if (!roomId) return null;
  return db.prepare('SELECT * FROM rooms WHERE room_id = ?').bind(roomId).first();
}

async function touchReturningPlayer(db, room, token, now) {
  if (!token || !room) return;
  if (token === room.red_token) {
    if (now - Number(room.red_seen || 0) >= HEARTBEAT_WRITE_INTERVAL_MS) {
      const result = await db.prepare('UPDATE rooms SET red_seen = ? WHERE room_id = ? AND red_token = ?')
        .bind(now, room.room_id, token).run();
      if (result.meta?.changes) room.red_seen = now;
    }
  } else if (token === room.black_token) {
    if (now - Number(room.black_seen || 0) >= HEARTBEAT_WRITE_INTERVAL_MS) {
      const result = await db.prepare('UPDATE rooms SET black_seen = ? WHERE room_id = ? AND black_token = ?')
        .bind(now, room.room_id, token).run();
      if (result.meta?.changes) room.black_seen = now;
    }
  }
}

async function releaseExpiredSeats(db, room, now, preserveToken = '') {
  if (!room) return;
  const cutoff = now - SEAT_TTL_MS;

  if (room.red_token && room.red_token !== preserveToken && Number(room.red_seen || 0) < cutoff) {
    const token = room.red_token;
    const result = await db.prepare(
      'UPDATE rooms SET red_token = NULL, red_name = NULL, red_seen = NULL WHERE room_id = ? AND red_token = ? AND COALESCE(red_seen, 0) < ?',
    ).bind(room.room_id, token, cutoff).run();
    if (result.meta?.changes) {
      room.red_token = null;
      room.red_name = null;
      room.red_seen = null;
    }
  }

  if (room.black_token && room.black_token !== preserveToken && Number(room.black_seen || 0) < cutoff) {
    const token = room.black_token;
    const result = await db.prepare(
      'UPDATE rooms SET black_token = NULL, black_name = NULL, black_seen = NULL WHERE room_id = ? AND black_token = ? AND COALESCE(black_seen, 0) < ?',
    ).bind(room.room_id, token, cutoff).run();
    if (result.meta?.changes) {
      room.black_token = null;
      room.black_name = null;
      room.black_seen = null;
    }
  }
}

function lifecyclePlayers(room, now) {
  const list = [];
  for (const color of ['red', 'black']) {
    const token = room?.[`${color}_token`];
    if (!token) continue;
    const seen = room[`${color}_seen`];
    const status = presenceState(seen, now);
    if (status === 'expired') continue;
    list.push({
      name: room[`${color}_name`] || '棋友',
      color,
      online: status === 'online',
    });
  }
  return list;
}

export async function decorateRoomResponse(request, env, response) {
  if (!env?.DB || !response?.ok) return response;

  let data;
  try {
    data = await response.clone().json();
  } catch {
    return response;
  }

  const requestCopy = request.clone();
  const identity = await readRequestIdentity(requestCopy, data.roomId || '');
  if (!identity.roomId) return response;

  const now = Date.now();
  const room = await getRoom(env.DB, identity.roomId);
  if (!room) return response;

  await touchReturningPlayer(env.DB, room, identity.token, now);
  await releaseExpiredSeats(env.DB, room, now, identity.token);

  data.players = lifecyclePlayers(room, now);
  data.lifecycle = {
    onlineWindowMs: ONLINE_WINDOW_MS,
    seatTtlMs: SEAT_TTL_MS,
  };

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function cleanupOldRooms(db, now = Date.now()) {
  if (!db) return null;
  const cutoff = now - ROOM_TTL_MS;
  return db.prepare(
    'DELETE FROM rooms WHERE updated_at < ? AND COALESCE(red_seen, 0) < ? AND COALESCE(black_seen, 0) < ?',
  ).bind(cutoff, cutoff, cutoff).run();
}
