import { roomsSchema, roomsUpdatedIndex } from "../../../db/schema";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const STALE_AFTER_MS = 120_000;

function initialState() {
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));
  const row = ["R", "H", "E", "A", "K", "A", "E", "H", "R"];
  row.forEach((t, x) => {
    board[0][x] = { t, c: "black" };
    board[9][x] = { t, c: "red" };
  });
  [1, 7].forEach((x) => {
    board[2][x] = { t: "C", c: "black" };
    board[7][x] = { t: "C", c: "red" };
  });
  [0, 2, 4, 6, 8].forEach((x) => {
    board[3][x] = { t: "P", c: "black" };
    board[6][x] = { t: "P", c: "red" };
  });
  return { board, turn: "red", winner: null, history: [] };
}

function cleanRoomId(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function cleanName(value) {
  return String(value || "棋友").trim().slice(0, 16) || "棋友";
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function database() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("DB binding is unavailable");
  await env.DB.batch([
    env.DB.prepare(roomsSchema),
    env.DB.prepare(roomsUpdatedIndex),
  ]);
  return env.DB;
}

function playerColor(room, token) {
  if (token && token === room.red_token) return "red";
  if (token && token === room.black_token) return "black";
  return "spectator";
}

function publicRoom(room, token) {
  const players = [];
  if (room.red_token) players.push({ name: room.red_name, color: "red" });
  if (room.black_token) players.push({ name: room.black_name, color: "black" });
  return {
    roomId: room.room_id,
    color: playerColor(room, token),
    state: JSON.parse(room.state),
    revision: room.revision,
    players,
    undoRequestedBy: room.undo_requested_by || null,
  };
}

async function getRoom(db, roomId) {
  return db.prepare("SELECT * FROM rooms WHERE room_id = ?").bind(roomId).first();
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
    const color = playerColor(room, token);
    if (color === "red") {
      await db.prepare("UPDATE rooms SET red_seen = ? WHERE room_id = ?").bind(now, roomId).run();
      room.red_seen = now;
    } else if (color === "black") {
      await db.prepare("UPDATE rooms SET black_seen = ? WHERE room_id = ?").bind(now, roomId).run();
      room.black_seen = now;
    }
    return json(publicRoom(room, token));
  } catch (error) {
    console.error(error);
    return json({ error: "棋局同步暫時失敗" }, 500);
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
      const preferredColor = body.preferredColor === "black" ? "black" : "red";
      if (!room) {
        const column = preferredColor === "red" ? "red" : "black";
        await db.prepare(
          `INSERT INTO rooms
           (room_id, state, revision, ${column}_token, ${column}_name, ${column}_seen, updated_at)
           VALUES (?, ?, 0, ?, ?, ?, ?)`
        ).bind(roomId, JSON.stringify(initialState()), token, cleanName(body.name), now, now).run();
        room = await getRoom(db, roomId);
        return json(publicRoom(room, token));
      }

      const redStale = room.red_token && now - Number(room.red_seen || 0) > STALE_AFTER_MS;
      const blackStale = room.black_token && now - Number(room.black_seen || 0) > STALE_AFTER_MS;
      if (token === room.red_token) {
        await db.prepare("UPDATE rooms SET red_name = ?, red_seen = ? WHERE room_id = ?")
          .bind(cleanName(body.name), now, roomId).run();
      } else if (token === room.black_token) {
        await db.prepare("UPDATE rooms SET black_name = ?, black_seen = ? WHERE room_id = ?")
          .bind(cleanName(body.name), now, roomId).run();
      } else if (preferredColor === "red" && (!room.red_token || redStale)) {
        await db.prepare("UPDATE rooms SET red_token = ?, red_name = ?, red_seen = ? WHERE room_id = ?")
          .bind(token, cleanName(body.name), now, roomId).run();
      } else if (preferredColor === "black" && (!room.black_token || blackStale)) {
        await db.prepare("UPDATE rooms SET black_token = ?, black_name = ?, black_seen = ? WHERE room_id = ?")
          .bind(token, cleanName(body.name), now, roomId).run();
      } else {
        return json({ error: preferredColor === "red" ? "紅方席位已有人，請選擇黑方" : "黑方席位已有人，請選擇紅方" }, 409);
      }
      room = await getRoom(db, roomId);
      return json(publicRoom(room, token));
    }

    if (!room) return json({ error: "找不到房間" }, 404);
    const color = playerColor(room, token);
    if (color === "spectator") return json({ error: "觀戰者不能操作棋局" }, 403);

    if (action === "move") {
      const nextState = body.state;
      const expectedRevision = Number(body.revision);
      if (!nextState?.board || !["red", "black"].includes(nextState.turn)) {
        return json({ error: "棋步資料無效" }, 400);
      }
      const currentState = JSON.parse(room.state);
      if (currentState.turn !== color || nextState.turn === color) {
        return json({ error: "尚未輪到你行棋" }, 409);
      }
      const result = await db.prepare(
        "UPDATE rooms SET previous_state = state, state = ?, undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ? AND revision = ?"
      ).bind(JSON.stringify(nextState), now, roomId, expectedRevision).run();
      if (!result.meta?.changes) return json({ error: "棋局已更新，正在重新同步" }, 409);
    } else if (action === "change-color") {
      const target = body.color === "black" ? "black" : "red";
      if (target !== color) {
        const targetToken = target === "red" ? room.red_token : room.black_token;
        const targetSeen = Number(target === "red" ? room.red_seen : room.black_seen) || 0;
        if (targetToken && now - targetSeen <= STALE_AFTER_MS) {
          return json({ error: target === "red" ? "紅方席位目前有人" : "黑方席位目前有人" }, 409);
        }
        const name = color === "red" ? room.red_name : room.black_name;
        if (target === "red") {
          await db.prepare("UPDATE rooms SET black_token = NULL, black_name = NULL, black_seen = NULL, red_token = ?, red_name = ?, red_seen = ?, revision = revision + 1, updated_at = ? WHERE room_id = ?")
            .bind(token, name, now, now, roomId).run();
        } else {
          await db.prepare("UPDATE rooms SET red_token = NULL, red_name = NULL, red_seen = NULL, black_token = ?, black_name = ?, black_seen = ?, revision = revision + 1, updated_at = ? WHERE room_id = ?")
            .bind(token, name, now, now, roomId).run();
        }
      }
    } else if (action === "request-undo") {
      const currentState = JSON.parse(room.state);
      const history = Array.isArray(currentState.history) ? currentState.history : [];
      if (history.length <= 1 && !room.previous_state) return json({ error: "已經回到開局，沒有可以撤回的棋步" }, 409);
      if (room.undo_requested_by) return json({ error: "已有悔棋請求等待回覆" }, 409);
      await db.prepare(
        "UPDATE rooms SET undo_requested_by = ?, revision = revision + 1, updated_at = ? WHERE room_id = ?"
      ).bind(color, now, roomId).run();
    } else if (action === "respond-undo") {
      if (!room.undo_requested_by) return json({ error: "悔棋請求已失效" }, 409);
      if (room.undo_requested_by === color) return json({ error: "請等待對方回覆" }, 403);
      if (body.accept) {
        const currentState = JSON.parse(room.state);
        const history = Array.isArray(currentState.history) ? currentState.history : [];
        let restoredState = null;
        if (history.length > 1) {
          const previousPosition = history[history.length - 2]?.position;
          if (previousPosition?.board) restoredState = { ...previousPosition, history: history.slice(0, -1) };
        }
        if (!restoredState && room.previous_state) restoredState = JSON.parse(room.previous_state);
        if (!restoredState) return json({ error: "已經回到開局，沒有可以撤回的棋步" }, 409);
        await db.prepare(
          "UPDATE rooms SET state = ?, previous_state = NULL, undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ?"
        ).bind(JSON.stringify(restoredState), now, roomId).run();
      } else {
        await db.prepare(
          "UPDATE rooms SET undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ?"
        ).bind(now, roomId).run();
      }
    } else if (action === "restart") {
      await db.prepare(
        "UPDATE rooms SET state = ?, previous_state = NULL, undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ?"
      ).bind(JSON.stringify(initialState()), now, roomId).run();
    } else {
      return json({ error: "未知操作" }, 400);
    }

    room = await getRoom(db, roomId);
    return json(publicRoom(room, token));
  } catch (error) {
    console.error(error);
    return json({ error: "棋局同步暫時失敗" }, 500);
  }
}
