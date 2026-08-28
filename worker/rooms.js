import { cloneBoard, hasLegalMove, legalMove } from "./rules.js";

const STALE_AFTER_MS = 120_000;
const HEARTBEAT_WRITE_INTERVAL_MS = 30_000;
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function initialState(variant = "standard") {
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
  if (variant === "jieqi") for (const color of ["red", "black"]) {
    const spots = [], types = [];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (piece?.c === color && piece.t !== "K") {
        spots.push({ y, x, o: piece.t });
        types.push(piece.t);
      }
    }
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    spots.forEach((spot, index) => {
      board[spot.y][spot.x] = { t: types[index], c: color, h: true, o: spot.o };
    });
  }
  return { board, turn: "red", winner: null, history: [], variant, captures: { red: [], black: [] } };
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function positionSnapshot(state) {
  return {
    board: clone(state.board),
    turn: state.turn,
    winner: state.winner || null,
    lastAction: state.lastAction ? clone(state.lastAction) : null,
    variant: state.variant || "standard",
    captures: clone(state.captures || { red: [], black: [] }),
  };
}
function visibleCaptures(captures, viewer) {
  const output = { red: [], black: [] };
  for (const side of ["red", "black"]) output[side] = (captures?.[side] || []).map((item) => {
    const hidden = item.hidden !== false;
    return !hidden || viewer === side ? { ...item, hidden } : { t: "?", c: item.c, hidden: true };
  });
  return output;
}
function privateState(state, viewer) {
  const output = clone(state);
  const maskBoard = (board) => board?.forEach((row) => row.forEach((piece) => {
    if (piece?.h) piece.t = "?";
  }));
  maskBoard(output.board);
  output.history?.forEach((entry) => maskBoard(entry.position?.board));
  output.captures = visibleCaptures(output.captures, viewer);
  output.history?.forEach((entry) => {
    if (entry.position?.captures) entry.position.captures = visibleCaptures(entry.position.captures, viewer);
  });
  return output;
}

function cleanRoomId(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}
function cleanName(value) {
  return String(value || "棋友").trim().slice(0, 16) || "棋友";
}
function requestToken(request, fallback = "") {
  return String(request.headers.get("X-Player-Token") || fallback || "").slice(0, 80);
}
function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
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
  const color = playerColor(room, token);
  return {
    roomId: room.room_id,
    color,
    state: privateState(JSON.parse(room.state), color),
    revision: room.revision,
    players,
    undoRequestedBy: room.undo_requested_by || null,
  };
}
async function getRoom(db, roomId) {
  return db.prepare("SELECT * FROM rooms WHERE room_id = ?").bind(roomId).first();
}
async function cleanupExpiredRooms(db, now) {
  const cutoff = now - ROOM_TTL_MS;
  return db.prepare(
    "DELETE FROM rooms WHERE updated_at < ? AND COALESCE(red_seen, 0) < ? AND COALESCE(black_seen, 0) < ?"
  ).bind(cutoff, cutoff, cutoff).run();
}
async function refreshHeartbeat(db, room, token, color, now) {
  if (color !== "red" && color !== "black") return;
  const seenKey = color === "red" ? "red_seen" : "black_seen";
  const lastSeen = Number(room[seenKey] || 0);
  if (now - lastSeen < HEARTBEAT_WRITE_INTERVAL_MS) return;
  const cutoff = now - HEARTBEAT_WRITE_INTERVAL_MS;
  const result = color === "red"
    ? await db.prepare(
      "UPDATE rooms SET red_seen = ? WHERE room_id = ? AND red_token = ? AND (red_seen IS NULL OR red_seen < ?)"
    ).bind(now, room.room_id, token, cutoff).run()
    : await db.prepare(
      "UPDATE rooms SET black_seen = ? WHERE room_id = ? AND black_token = ? AND (black_seen IS NULL OR black_seen < ?)"
    ).bind(now, room.room_id, token, cutoff).run();
  if (result.meta?.changes) room[seenKey] = now;
}

export async function handleGet(request, env) {
  try {
    if (!env?.DB) return json({ error: "DB binding is unavailable" }, 500);
    const url = new URL(request.url);
    const roomId = cleanRoomId(url.searchParams.get("room"));
    const token = requestToken(request, url.searchParams.get("token"));
    if (!roomId) return json({ error: "房間代碼無效" }, 400);
    const room = await getRoom(env.DB, roomId);
    if (!room) return json({ error: "找不到房間" }, 404);
    const now = Date.now();
    const color = playerColor(room, token);
    await refreshHeartbeat(env.DB, room, token, color, now);
    return json(publicRoom(room, token));
  } catch (error) {
    console.error(error);
    return json({ error: "棋局同步暫時失敗" }, 500);
  }
}

export async function handlePost(request, env) {
  try {
    if (!env?.DB) return json({ error: "DB binding is unavailable" }, 500);
    const body = await request.json();
    const action = String(body.action || "");
    const roomId = cleanRoomId(body.roomId);
    const token = requestToken(request, body.token);
    if (!roomId || !token) return json({ error: "房間資料無效" }, 400);

    const db = env.DB;
    const now = Date.now();
    if (action === "join") await cleanupExpiredRooms(db, now);
    let room = await getRoom(db, roomId);

    if (action === "join") {
      const preferredColor = body.preferredColor === "black" ? "black" : "red";
      const gameVariant = body.gameVariant === "jieqi" ? "jieqi" : "standard";
      const playerName = cleanName(body.name);
      if (!room) {
        const column = preferredColor === "red" ? "red" : "black";
        await db.prepare(
          `INSERT OR IGNORE INTO rooms
           (room_id, state, revision, ${column}_token, ${column}_name, ${column}_seen, updated_at)
           VALUES (?, ?, 0, ?, ?, ?, ?)`
        ).bind(roomId, JSON.stringify(initialState(gameVariant)), token, playerName, now, now).run();
        room = await getRoom(db, roomId);
        if (playerColor(room, token) !== "spectator") return json(publicRoom(room, token));
      }

      const redStale = room.red_token && now - Number(room.red_seen || 0) > STALE_AFTER_MS;
      const blackStale = room.black_token && now - Number(room.black_seen || 0) > STALE_AFTER_MS;
      if (token === room.red_token) {
        await db.prepare("UPDATE rooms SET red_name = ?, red_seen = ? WHERE room_id = ?")
          .bind(playerName, now, roomId).run();
      } else if (token === room.black_token) {
        await db.prepare("UPDATE rooms SET black_name = ?, black_seen = ? WHERE room_id = ?")
          .bind(playerName, now, roomId).run();
      } else if (preferredColor === "red" && (!room.red_token || redStale)) {
        const result = await db.prepare(
          "UPDATE rooms SET red_token = ?, red_name = ?, red_seen = ? WHERE room_id = ? AND (red_token IS NULL OR red_seen < ?)"
        ).bind(token, playerName, now, roomId, now - STALE_AFTER_MS).run();
        if (!result.meta?.changes) return json({ error: "紅方席位剛被加入，請選擇黑方" }, 409);
      } else if (preferredColor === "black" && (!room.black_token || blackStale)) {
        const result = await db.prepare(
          "UPDATE rooms SET black_token = ?, black_name = ?, black_seen = ? WHERE room_id = ? AND (black_token IS NULL OR black_seen < ?)"
        ).bind(token, playerName, now, roomId, now - STALE_AFTER_MS).run();
        if (!result.meta?.changes) return json({ error: "黑方席位剛被加入，請選擇紅方" }, 409);
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
      const expectedRevision = Number(body.revision);
      const currentState = JSON.parse(room.state);
      if (currentState.turn !== color || currentState.winner) {
        return json({ error: "尚未輪到你行棋" }, 409);
      }

      const submittedState = body.state;
      const from = submittedState?.lastAction?.from || body.from;
      const to = submittedState?.lastAction?.to || body.to;
      if (![from?.x, from?.y, to?.x, to?.y].every(Number.isInteger)) {
        return json({ error: "棋步位置無效" }, 400);
      }

      const moving = currentState.board?.[from.y]?.[from.x];
      const captured = currentState.board?.[to.y]?.[to.x];
      const variant = currentState.variant || "standard";
      if (!legalMove(color, from, to, currentState.board, variant)) {
        return json({ error: "不合法的棋步" }, 400);
      }

      const authoritativeBoard = cloneBoard(currentState.board);
      authoritativeBoard[to.y][to.x] = { ...moving, h: false };
      authoritativeBoard[from.y][from.x] = null;
      const nextTurn = color === "red" ? "black" : "red";
      const nextState = {
        ...currentState,
        board: authoritativeBoard,
        turn: nextTurn,
        winner: captured?.t === "K" || !hasLegalMove(nextTurn, authoritativeBoard, variant) ? color : null,
        lastAction: { from, to, capture: Boolean(captured), reveal: Boolean(moving?.h) },
        variant,
        captures: clone(currentState.captures || { red: [], black: [] }),
      };
      if (captured) nextState.captures[color].push({ t: captured.t, c: captured.c, hidden: Boolean(captured.h) });
      const oldHistory = Array.isArray(currentState.history) ? clone(currentState.history) : [];
      if (!oldHistory.length) oldHistory.push({ label: "開局", position: positionSnapshot(currentState) });
      const submittedLabel = submittedState?.history?.[submittedState.history.length - 1]?.label;
      const label = String(submittedLabel || body.label || "行棋").slice(0, 16);
      nextState.history = [...oldHistory, { label, position: positionSnapshot(nextState) }];

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
          await db.prepare(
            "UPDATE rooms SET black_token = NULL, black_name = NULL, black_seen = NULL, red_token = ?, red_name = ?, red_seen = ?, revision = revision + 1, updated_at = ? WHERE room_id = ?"
          ).bind(token, name, now, now, roomId).run();
        } else {
          await db.prepare(
            "UPDATE rooms SET red_token = NULL, red_name = NULL, red_seen = NULL, black_token = ?, black_name = ?, black_seen = ?, revision = revision + 1, updated_at = ? WHERE room_id = ?"
          ).bind(token, name, now, now, roomId).run();
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
      const currentState = JSON.parse(room.state);
      await db.prepare(
        "UPDATE rooms SET state = ?, previous_state = NULL, undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ?"
      ).bind(JSON.stringify(initialState(currentState.variant || "standard")), now, roomId).run();
    } else if (action === "custom-setup") {
      const customState = body.state;
      const validBoard = Array.isArray(customState?.board) && customState.board.length === 10 && customState.board.every((row) =>
        Array.isArray(row) && row.length === 9 && row.every((piece) => piece === null || (
          ["red", "black"].includes(piece?.c) && ["K", "A", "E", "H", "R", "C", "P"].includes(piece?.t)
        )),
      );
      const kingCount = validBoard
        ? customState.board.flat().filter((piece) => piece?.t === "K").reduce(
          (counts, piece) => ({ ...counts, [piece.c]: counts[piece.c] + 1 }),
          { red: 0, black: 0 },
        )
        : null;
      if (!validBoard || kingCount.red !== 1 || kingCount.black !== 1 || !["red", "black"].includes(customState.turn)) {
        return json({ error: "自訂棋局資料無效" }, 400);
      }
      const safeState = {
        board: clone(customState.board),
        turn: customState.turn,
        winner: null,
        history: [],
        lastAction: null,
        variant: customState.variant === "jieqi" ? "jieqi" : "standard",
        captures: { red: [], black: [] },
      };
      await db.prepare(
        "UPDATE rooms SET state = ?, previous_state = NULL, undo_requested_by = NULL, revision = revision + 1, updated_at = ? WHERE room_id = ?"
      ).bind(JSON.stringify(safeState), now, roomId).run();
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
