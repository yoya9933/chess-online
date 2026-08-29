import { inCheck } from './rules.js';

function cleanRoomId(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
function requestToken(request) {
  return String(request.headers.get('X-Player-Token') || '').slice(0, 80);
}
function playerColor(room, token) {
  if (token && token === room.red_token) return 'red';
  if (token && token === room.black_token) return 'black';
  return 'spectator';
}
function opposite(color) { return color === 'red' ? 'black' : 'red'; }

export function positionKey(state) {
  const board = (state?.board || []).map((row) => row.map((piece) => {
    if (!piece) return '.';
    return `${piece.c[0]}${piece.t}${piece.h ? 'h' : 'o'}${piece.o || ''}`;
  }).join(',')).join('/');
  return `${state?.variant || 'standard'}|${state?.turn || 'red'}|${board}`;
}

export function classifyRepetition(entries) {
  if (!Array.isArray(entries) || entries.length < 3) return null;
  const last = entries[entries.length - 1];
  const same = entries.filter((entry) => entry.position_key === last.position_key).slice(-3);
  if (same.length < 3) return null;
  const checkingSide = same[0].mover;
  if (same.every((entry) => entry.mover === checkingSide && Number(entry.gives_check) === 1)) {
    return { type: 'long-check', winner: opposite(checkingSide), loser: checkingSide };
  }
  return { type: 'repetition', winner: null, loser: null };
}

async function roomById(db, roomId) {
  return db.prepare('SELECT * FROM rooms WHERE room_id = ?').bind(roomId).first();
}

async function setResultWithoutRevision(db, room, state, result) {
  state.result = { finished: true, ...result, at: Date.now() };
  state.drawRequestBy = null;
  state.winner = result.winner || 'draw';
  await db.prepare('UPDATE rooms SET state = ? WHERE room_id = ? AND revision = ?')
    .bind(JSON.stringify(state), room.room_id, room.revision).run();
}

export async function afterRoomMutation(request, env, responseData) {
  if (!env?.DB || request.method !== 'POST' || !responseData?.roomId) return false;
  let body;
  try { body = await request.json(); } catch { return false; }
  const action = String(body.action || '');
  const roomId = cleanRoomId(responseData.roomId || body.roomId);
  if (!roomId) return false;

  if (action === 'restart' || action === 'custom-setup' || (action === 'respond-undo' && body.accept)) {
    await env.DB.prepare('DELETE FROM position_log WHERE room_id = ?').bind(roomId).run();
    return false;
  }
  if (action !== 'move') return false;

  const room = await roomById(env.DB, roomId);
  if (!room) return false;
  const state = JSON.parse(room.state);
  const mover = opposite(state.turn);
  const key = positionKey(state);
  const givesCheck = inCheck(state.turn, state.board, state.variant || 'standard') ? 1 : 0;
  await env.DB.prepare(`
    INSERT OR REPLACE INTO position_log (room_id, revision, position_key, mover, gives_check, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(roomId, Number(room.revision), key, mover, givesCheck, Date.now()).run();

  if (state.result?.finished) return false;
  if (state.winner && state.winner !== 'draw') {
    const defendingKingExists = state.board.flat().some((piece) => piece?.c === state.turn && piece?.t === 'K');
    const type = !defendingKingExists ? 'king-capture' : (givesCheck ? 'checkmate' : 'no-legal-move');
    await setResultWithoutRevision(env.DB, room, state, { type, winner: state.winner, loser: opposite(state.winner) });
    return true;
  }

  const recent = await env.DB.prepare(`
    SELECT position_key, mover, gives_check
    FROM position_log
    WHERE room_id = ? AND position_key = ?
    ORDER BY revision ASC
  `).bind(roomId, key).all();
  const classification = classifyRepetition(recent.results || []);
  if (!classification) return false;
  await setResultWithoutRevision(env.DB, room, state, classification);
  return true;
}

export async function handleAdjudication(request, env) {
  if (!env?.DB) return Response.json({ error: 'DB binding is unavailable' }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON 格式無效' }, { status: 400 }); }
  const roomId = cleanRoomId(body.roomId);
  const token = requestToken(request);
  const action = String(body.action || '');
  const room = await roomById(env.DB, roomId);
  if (!room) return Response.json({ error: '找不到房間' }, { status: 404 });
  const color = playerColor(room, token);
  if (color === 'spectator') return Response.json({ error: '觀戰者不能裁決棋局' }, { status: 403 });
  const state = JSON.parse(room.state);
  if (state.result?.finished || state.winner) return Response.json({ error: '棋局已結束' }, { status: 409 });

  if (action === 'resign') {
    const winner = opposite(color);
    state.winner = winner;
    state.result = { finished: true, type: 'resign', winner, loser: color, at: Date.now() };
    state.drawRequestBy = null;
  } else if (action === 'request-draw') {
    if (state.drawRequestBy) return Response.json({ error: '已有和棋請求等待回覆' }, { status: 409 });
    state.drawRequestBy = color;
  } else if (action === 'respond-draw') {
    if (!state.drawRequestBy) return Response.json({ error: '和棋請求已失效' }, { status: 409 });
    if (state.drawRequestBy === color) return Response.json({ error: '請等待對方回覆' }, { status: 403 });
    if (body.accept) {
      state.winner = 'draw';
      state.result = { finished: true, type: 'draw-agreed', winner: null, loser: null, at: Date.now() };
    }
    state.drawRequestBy = null;
  } else {
    return Response.json({ error: '未知裁決操作' }, { status: 400 });
  }

  const result = await env.DB.prepare(
    'UPDATE rooms SET state = ?, revision = revision + 1, updated_at = ? WHERE room_id = ? AND revision = ?'
  ).bind(JSON.stringify(state), Date.now(), roomId, room.revision).run();
  if (!result.meta?.changes) return Response.json({ error: '棋局已更新，請重新同步' }, { status: 409 });
  return Response.json({ ok: true, roomId, finished: Boolean(state.result?.finished) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
