function cleanRoomId(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
function playerColor(room, token) {
  if (token && token === room.red_token) return 'red';
  if (token && token === room.black_token) return 'black';
  return 'spectator';
}
function opposite(color) { return color === 'red' ? 'black' : 'red'; }

export function settleClockValue(clock, now = Date.now()) {
  if (!clock?.configured || !clock.started || !clock.runningSince || !['red', 'black'].includes(clock.active)) {
    return { clock, timedOut: null };
  }
  const elapsed = Math.max(0, now - Number(clock.runningSince));
  const active = clock.active;
  const remaining = Math.max(0, Number(clock[`${active}Ms`] || 0) - elapsed);
  const next = { ...clock, [`${active}Ms`]: remaining, runningSince: now };
  return { clock: next, timedOut: remaining <= 0 ? active : null };
}

export function resumeClockAfterUndo(clock, restoredTurn, now = Date.now()) {
  if (!clock?.configured) return clock || null;
  const next = { ...clock };
  if (next.started && ['red', 'black'].includes(restoredTurn)) {
    next.active = restoredTurn;
    next.runningSince = now;
  }
  return next;
}

async function getRoom(db, roomId) {
  return db.prepare('SELECT * FROM rooms WHERE room_id = ?').bind(roomId).first();
}

async function writeState(db, room, state, bumpRevision = false) {
  const sql = bumpRevision
    ? 'UPDATE rooms SET state = ?, revision = revision + 1, updated_at = ? WHERE room_id = ? AND revision = ?'
    : 'UPDATE rooms SET state = ?, updated_at = ? WHERE room_id = ? AND revision = ?';
  return db.prepare(sql).bind(JSON.stringify(state), Date.now(), room.room_id, room.revision).run();
}

async function settleRoomClock(db, room, now, bumpOnTimeout = true) {
  const state = JSON.parse(room.state);
  if (!state.clock?.configured || state.result?.finished || state.winner) return { room, state, timedOut: null, changed: false };
  const settled = settleClockValue(state.clock, now);
  if (settled.clock === state.clock) return { room, state, timedOut: null, changed: false };
  state.clock = settled.clock;
  if (settled.timedOut) {
    const winner = opposite(settled.timedOut);
    state.winner = winner;
    state.result = { finished: true, type: 'timeout', winner, loser: settled.timedOut, at: now };
    state.drawRequestBy = null;
  }
  const result = await writeState(db, room, state, Boolean(settled.timedOut && bumpOnTimeout));
  return { room, state, timedOut: settled.timedOut, changed: Boolean(result.meta?.changes) };
}

export async function beforeRoomMutationClock(request, env) {
  if (!env?.DB || request.method !== 'POST') return null;
  let body;
  try { body = await request.json(); } catch { return null; }
  const isMove = body.action === 'move';
  const isUndoAccept = body.action === 'respond-undo' && Boolean(body.accept);
  if (!isMove && !isUndoAccept) return null;
  const roomId = cleanRoomId(body.roomId);
  const room = await getRoom(env.DB, roomId);
  if (!room) return null;
  const settled = await settleRoomClock(env.DB, room, Date.now(), true);
  if (settled.timedOut) return { timedOut: settled.timedOut, roomId };
  if (isUndoAccept && settled.state?.clock?.configured) {
    return { timedOut: null, roomId, clock: settled.state.clock };
  }
  return null;
}

export async function afterRoomMutationClock(request, env, responseData, context = null) {
  if (!env?.DB || request.method !== 'POST' || !responseData?.roomId) return false;
  let body;
  try { body = await request.json(); } catch { return false; }

  if (body.action === 'respond-undo' && Boolean(body.accept) && context?.clock) {
    const room = await getRoom(env.DB, cleanRoomId(responseData.roomId));
    if (!room) return false;
    const state = JSON.parse(room.state);
    if (state.result?.finished || state.winner) return false;
    state.clock = resumeClockAfterUndo(context.clock, state.turn, Date.now());
    const result = await writeState(env.DB, room, state, false);
    return Boolean(result.meta?.changes);
  }

  if (body.action !== 'move') return false;
  const room = await getRoom(env.DB, cleanRoomId(responseData.roomId));
  if (!room) return false;
  const state = JSON.parse(room.state);
  if (!state.clock?.configured || state.result?.finished || state.winner) return false;
  const mover = opposite(state.turn);
  const clock = { ...state.clock };
  if (!clock.started) clock.started = true;
  clock.active = state.turn;
  clock.runningSince = Date.now();
  clock[`${mover}Ms`] = Math.max(0, Number(clock[`${mover}Ms`] || 0) + Number(clock.incrementMs || 0));
  state.clock = clock;
  const result = await writeState(env.DB, room, state, false);
  return Boolean(result.meta?.changes);
}

export async function handleClock(request, env) {
  if (!env?.DB) return Response.json({ error: 'DB binding is unavailable' }, { status: 500 });
  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') {
    try { body = await request.json(); } catch { return Response.json({ error: 'JSON 格式無效' }, { status: 400 }); }
  }
  const roomId = cleanRoomId(request.method === 'GET' ? url.searchParams.get('room') : body.roomId);
  const token = String(request.headers.get('X-Player-Token') || '');
  let room = await getRoom(env.DB, roomId);
  if (!room) return Response.json({ error: '找不到房間' }, { status: 404 });
  const color = playerColor(room, token);
  if (color === 'spectator') return Response.json({ error: '觀戰者不能設定棋鐘' }, { status: 403 });

  if (request.method === 'POST') {
    if (body.action !== 'configure') return Response.json({ error: '未知棋鐘操作' }, { status: 400 });
    const state = JSON.parse(room.state);
    if (state.lastAction || (state.history?.length || 0) > 1) return Response.json({ error: '開局後不能修改棋鐘' }, { status: 409 });
    const initialMs = Math.min(180 * 60_000, Math.max(60_000, Number(body.initialMs || 0)));
    const incrementMs = Math.min(60_000, Math.max(0, Number(body.incrementMs || 0)));
    state.clock = {
      configured: true, initialMs, incrementMs,
      redMs: initialMs, blackMs: initialMs,
      started: false, active: 'red', runningSince: null,
    };
    const result = await writeState(env.DB, room, state, true);
    if (!result.meta?.changes) return Response.json({ error: '棋局已更新，請重試' }, { status: 409 });
    room = await getRoom(env.DB, roomId);
  } else {
    const settled = await settleRoomClock(env.DB, room, Date.now(), true);
    if (settled.changed) room = await getRoom(env.DB, roomId);
  }

  const state = JSON.parse(room.state);
  return Response.json({ roomId, clock: state.clock || null, result: state.result || null, revision: Number(room.revision), serverNow: Date.now() }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
