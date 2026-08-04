export const runtime = "edge";
export const dynamic = "force-dynamic";

const STALE_AFTER_MS = 120_000;
const schema = `CREATE TABLE IF NOT EXISTS banqi_rooms (
  room_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  a_token TEXT,
  a_name TEXT,
  a_seen BIGINT,
  b_token TEXT,
  b_name TEXT,
  b_seen BIGINT,
  previous_state TEXT,
  undo_requested_by TEXT,
  updated_at BIGINT NOT NULL
)`;
const updatedIndex = "CREATE INDEX IF NOT EXISTS banqi_rooms_updated_at_idx ON banqi_rooms(updated_at)";

const pieceCounts = {
  red: { K: 1, A: 2, E: 2, R: 2, H: 2, C: 2, P: 5 },
  black: { K: 1, A: 2, E: 2, R: 2, H: 2, C: 2, P: 5 },
};
const ranks = { K: 7, A: 6, E: 5, R: 4, H: 3, C: 2, P: 1 };

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function initialState() {
  const pieces = [];
  for (const color of ["red", "black"]) {
    for (const [type, count] of Object.entries(pieceCounts[color])) {
      for (let i = 0; i < count; i++) pieces.push({ t: type, c: color, faceUp: false });
    }
  }
  shuffle(pieces);
  const board = Array.from({ length: 4 }, (_, y) =>
    Array.from({ length: 8 }, (_, x) => pieces[y * 8 + x])
  );
  return {
    board,
    turnSeat: "a",
    assignments: { a: null, b: null },
    winnerSeat: null,
    captures: { a: [], b: [] },
    moveCount: 0,
    lastAction: null,
  };
}
function cleanRoomId(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}
function cleanName(value) {
  return String(value || "棋友").trim().slice(0, 16) || "棋友";
}
function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
async function database() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL, { fullResults: true });
    const prepare = (query) => ({
      params: [],
      bind(...params) { this.params = params; return this; },
      async execute() {
        let index = 0;
        const postgresQuery = query.replace(/\?/g, () => `$${++index}`);
        return sql.query(postgresQuery, this.params);
      },
      async first() { const result = await this.execute(); return result.rows?.[0] || null; },
      async run() { const result = await this.execute(); return { meta: { changes: result.rowCount || 0 } }; },
    });
    await prepare(schema).run();
    await prepare(updatedIndex).run();
    return { prepare };
  }
  const cloudflareRuntime = "cloudflare:workers";
  const { env } = await import(cloudflareRuntime);
  if (!env.DB) throw new Error("DB binding is unavailable");
  await env.DB.batch([env.DB.prepare(schema), env.DB.prepare(updatedIndex)]);
  return env.DB;
}
async function getRoom(db, roomId) {
  return db.prepare("SELECT * FROM banqi_rooms WHERE room_id = ?").bind(roomId).first();
}
function seatOf(room, token) {
  if (token && token === room.a_token) return "a";
  if (token && token === room.b_token) return "b";
  return "spectator";
}
function publicRoom(room, token) {
  const seat = seatOf(room, token);
  const players = [];
  if (room.a_token) players.push({ seat: "a", name: room.a_name });
  if (room.b_token) players.push({ seat: "b", name: room.b_name });
  return {
    roomId: room.room_id,
    seat,
    players,
    revision: Number(room.revision),
    state: JSON.parse(room.state),
    undoRequestedBy: room.undo_requested_by || null,
  };
}
function inside(point) {
  return Number.isInteger(point?.x) && Number.isInteger(point?.y) && point.x >= 0 && point.x < 8 && point.y >= 0 && point.y < 4;
}
function adjacent(from, to) {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
}
function betweenCount(board, from, to) {
  if (from.x !== to.x && from.y !== to.y) return -1;
  let count = 0;
  if (from.x === to.x) {
    for (let y = Math.min(from.y, to.y) + 1; y < Math.max(from.y, to.y); y++) if (board[y][from.x]) count++;
  } else {
    for (let x = Math.min(from.x, to.x) + 1; x < Math.max(from.x, to.x); x++) if (board[from.y][x]) count++;
  }
  return count;
}
function canCapture(attacker, target) {
  if (!attacker || !target || !attacker.faceUp || !target.faceUp || attacker.c === target.c) return false;
  if (attacker.t === "C") return true;
  if (attacker.t === "P" && target.t === "K") return true;
  if (attacker.t === "K" && target.t === "P") return false;
  return ranks[attacker.t] >= ranks[target.t];
}
function remainingColors(board) {
  const set = new Set();
  for (const row of board) for (const piece of row) if (piece) set.add(piece.c);
  return set;
}
function applyAction(state, seat, action) {
  if (state.winnerSeat) throw new Error("棋局已結束");
  if (state.turnSeat !== seat) throw new Error("尚未輪到你");
  const board = clone(state.board);
  const next = clone(state);
  next.board = board;

  if (action.kind === "flip") {
    const at = action.at;
    if (!inside(at)) throw new Error("翻棋位置無效");
    const piece = board[at.y][at.x];
    if (!piece || piece.faceUp) throw new Error("此處不能翻棋");
    piece.faceUp = true;
    if (!next.assignments.a && !next.assignments.b) {
      next.assignments[seat] = piece.c;
      next.assignments[seat === "a" ? "b" : "a"] = piece.c === "red" ? "black" : "red";
    }
    next.lastAction = { kind: "flip", at, piece: { t: piece.t, c: piece.c } };
  } else if (action.kind === "move") {
    const from = action.from, to = action.to;
    if (!inside(from) || !inside(to)) throw new Error("移動位置無效");
    const moving = board[from.y][from.x];
    const target = board[to.y][to.x];
    const assignedColor = next.assignments[seat];
    if (!assignedColor) throw new Error("請先翻棋決定陣營");
    if (!moving || !moving.faceUp || moving.c !== assignedColor) throw new Error("不能操作此棋子");
    if (target?.c === moving.c) throw new Error("不能吃自己的棋子");

    if (moving.t === "C" && target) {
      if (!target.faceUp || betweenCount(board, from, to) !== 1) throw new Error("炮必須隔一子才能吃棋");
    } else {
      if (!adjacent(from, to)) throw new Error("棋子每次只能移動一格");
      if (target && !canCapture(moving, target)) throw new Error("此棋子不能吃掉目標");
    }
    if (moving.t === "C" && !target && !adjacent(from, to)) throw new Error("炮移動時只能走一格");

    if (target) next.captures[seat].push({ t: target.t, c: target.c });
    board[to.y][to.x] = moving;
    board[from.y][from.x] = null;
    next.lastAction = { kind: "move", from, to, capture: Boolean(target), piece: { t: moving.t, c: moving.c } };
  } else {
    throw new Error("未知操作");
  }

  next.moveCount = Number(next.moveCount || 0) + 1;
  const colors = remainingColors(board);
  if (next.assignments.a && colors.size === 1) {
    const onlyColor = [...colors][0];
    next.winnerSeat = next.assignments.a === onlyColor ? "a" : "b";
  }
  if (!next.winnerSeat) next.turnSeat = seat === "a" ? "b" : "a";
  return next;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const roomId = cleanRoomId(url.searchParams.get("room"));
    const token = String(url.searchParams.get("token") || "").slice(0, 80);
    if (!roomId) return json({ error: "房間代碼無效" }, 400);
    const db = await database();
    const room = await getRoom(db, roomId);
    if (!room) return json({ error: "找不到房間" }, 404);
    const now = Date.now();
    const seat = seatOf(room, token);
    if (seat === "a") await db.prepare("UPDATE banqi_rooms SET a_seen = ? WHERE room_id = ?").bind(now, roomId).run();
    if (seat === "b") await db.prepare("UPDATE banqi_rooms SET b_seen = ? WHERE room_id = ?").bind(now, roomId).run();
    return json(publicRoom(await getRoom(db, roomId), token));
  } catch (error) {
    console.error(error);
    return json({ error: "暗棋同步暫時失敗" }, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = String(body.action || "");
    const roomId = cleanRoomId(body.roomId);
    const token = String(body.token || "").slice(0, 80);
    if (!roomId || !token) return json({ error: "房間資料無效" }, 400);
    const db = await database();
    const now = Date.now();
    let room = await getRoom(db, roomId);

    if (action === "join") {
      if (!room) {
        await db.prepare(
          "INSERT INTO banqi_rooms (room_id, state, revision, a_token, a_name, a_seen, updated_at) VALUES (?, ?, 0, ?, ?, ?, ?)"
        ).bind(roomId, JSON.stringify(initialState()), token, cleanName(body.name), now, now).run();
      } else if (token === room.a_token) {
        await db.prepare("UPDATE banqi_rooms SET a_name = ?, a_seen = ? WHERE room_id = ?").bind(cleanName(body.name), now, roomId).run();
      } else if (token === room.b_token) {
        await db.prepare("UPDATE banqi_rooms SET b_name = ?, b_seen = ? WHERE room_id = ?").bind(cleanName(body.name), now, roomId).run();
      } else {
        const aStale = room.a_token && now - Number(room.a_seen || 0) > STALE_AFTER_MS;
        const bStale = room.b_token && now - Number(room.b_seen || 0) > STALE_AFTER_MS;
        if (!room.a_token || aStale) {
          await db.prepare("UPDATE banqi_rooms SET a_token = ?, a_name = ?, a_seen = ?, updated_at = ? WHERE room_id = ?").bind(token, cleanName(body.name), now, now, roomId).run();
        } else if (!room.b_token || bStale) {
          await db.prepare("UPDATE banqi_rooms SET b_token = ?, b_name = ?, b_seen = ?, updated_at = ? WHERE room_id = ?").bind(token, cleanName(body.name), now, now, roomId).run();
        } else {
          return json({ error: "房間已有兩位玩家" }, 409);
        }
      }
      return json(publicRoom(await getRoom(db, roomId), token));
    }

    if (!room) return json({ error: "找不到房間" }, 404);
    const seat = seatOf(room, token);
    if (seat === "spectator") return json({ error: "觀戰者不能操作棋局" }, 403);

    if (action === "play") {
      const expectedRevision = Number(body.revision);
      const currentState = JSON.parse(room.state);
      let nextState;
      try { nextState = applyAction(currentState, seat, body.play || {}); }
      catch (error) { return json({ error: error.message }, 409); }
      const result = await db.prepare(
        "UPDATE banqi_rooms SET previous_state = state, state = ?, undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ? AND revision = ?"
      ).bind(JSON.stringify(nextState), now, roomId, expectedRevision).run();
      if (!result.meta?.changes) return json({ error: "棋局已更新，正在重新同步" }, 409);
    } else if (action === "request-undo") {
      if (!room.previous_state) return json({ error: "目前沒有可撤回的棋步" }, 409);
      if (room.undo_requested_by) return json({ error: "已有悔棋請求等待回覆" }, 409);
      await db.prepare("UPDATE banqi_rooms SET undo_requested_by = ?, revision = revision + 1, updated_at = ? WHERE room_id = ?")
        .bind(seat, now, roomId).run();
    } else if (action === "respond-undo") {
      if (!room.undo_requested_by) return json({ error: "悔棋請求已失效" }, 409);
      if (room.undo_requested_by === seat) return json({ error: "請等待對方回覆" }, 403);
      if (body.accept && room.previous_state) {
        await db.prepare("UPDATE banqi_rooms SET state = previous_state, previous_state = NULL, undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ?")
          .bind(now, roomId).run();
      } else {
        await db.prepare("UPDATE banqi_rooms SET undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ?")
          .bind(now, roomId).run();
      }
    } else if (action === "restart") {
      await db.prepare("UPDATE banqi_rooms SET state = ?, previous_state = NULL, undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ?")
        .bind(JSON.stringify(initialState()), now, roomId).run();
    } else {
      return json({ error: "未知操作" }, 400);
    }
    return json(publicRoom(await getRoom(db, roomId), token));
  } catch (error) {
    console.error(error);
    return json({ error: "暗棋操作暫時失敗" }, 500);
  }
}
