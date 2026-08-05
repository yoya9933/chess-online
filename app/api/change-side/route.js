export const runtime = "edge";
export const dynamic = "force-dynamic";

function cleanRoomId(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function database() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL, { fullResults: true });
    const prepare = (query) => {
      const statement = {
        params: [],
        bind(...params) { this.params = params; return this; },
        async execute() {
          let index = 0;
          const postgresQuery = query.replace(/\?/g, () => `$${++index}`);
          return sql.query(postgresQuery, this.params);
        },
        async first() { const result = await this.execute(); return result.rows?.[0] || null; },
        async run() { const result = await this.execute(); return { meta: { changes: result.rowCount || 0 } }; },
      };
      return statement;
    };
    return { prepare };
  }

  const cloudflareRuntime = "cloudflare:workers";
  const { env } = await import(cloudflareRuntime);
  if (!env.DB) throw new Error("DB binding is unavailable");
  return env.DB;
}

function playerColor(room, token) {
  if (token && token === room.red_token) return "red";
  if (token && token === room.black_token) return "black";
  return "spectator";
}

function players(room) {
  const output = [];
  if (room.red_token) output.push({ name: room.red_name, color: "red" });
  if (room.black_token) output.push({ name: room.black_name, color: "black" });
  return output;
}

function hasStarted(state) {
  return Boolean(state?.lastAction) || (Array.isArray(state?.history) && state.history.length > 1);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const roomId = cleanRoomId(body.roomId);
    const token = String(body.token || "").slice(0, 80);
    const target = body.color === "black" ? "black" : "red";
    if (!roomId || !token) return json({ error: "房間資料無效" }, 400);

    const db = await database();
    let room = await db.prepare("SELECT * FROM rooms WHERE room_id = ?").bind(roomId).first();
    if (!room) return json({ error: "找不到房間" }, 404);

    const color = playerColor(room, token);
    if (color === "spectator") return json({ error: "觀戰者不能切換陣營" }, 403);
    if (target === color) {
      return json({ color, players: players(room), revision: room.revision, swapped: false });
    }

    const state = JSON.parse(room.state);
    if (hasStarted(state)) return json({ error: "第一手落下後不可換邊；請先重新開局" }, 409);

    const now = Date.now();
    const expectedRevision = Number(room.revision || 0);
    const targetOccupied = target === "red" ? Boolean(room.red_token) : Boolean(room.black_token);
    let result;

    if (color === "red" && target === "black") {
      if (targetOccupied) {
        result = await db.prepare(
          "UPDATE rooms SET red_token = black_token, red_name = black_name, red_seen = black_seen, black_token = ?, black_name = ?, black_seen = ?, revision = revision + 1, updated_at = ? WHERE room_id = ? AND revision = ?"
        ).bind(token, room.red_name, now, now, roomId, expectedRevision).run();
      } else {
        result = await db.prepare(
          "UPDATE rooms SET red_token = NULL, red_name = NULL, red_seen = NULL, black_token = ?, black_name = ?, black_seen = ?, revision = revision + 1, updated_at = ? WHERE room_id = ? AND revision = ?"
        ).bind(token, room.red_name, now, now, roomId, expectedRevision).run();
      }
    } else if (color === "black" && target === "red") {
      if (targetOccupied) {
        result = await db.prepare(
          "UPDATE rooms SET black_token = red_token, black_name = red_name, black_seen = red_seen, red_token = ?, red_name = ?, red_seen = ?, revision = revision + 1, updated_at = ? WHERE room_id = ? AND revision = ?"
        ).bind(token, room.black_name, now, now, roomId, expectedRevision).run();
      } else {
        result = await db.prepare(
          "UPDATE rooms SET black_token = NULL, black_name = NULL, black_seen = NULL, red_token = ?, red_name = ?, red_seen = ?, revision = revision + 1, updated_at = ? WHERE room_id = ? AND revision = ?"
        ).bind(token, room.black_name, now, now, roomId, expectedRevision).run();
      }
    }

    if (!result?.meta?.changes) return json({ error: "房間已更新，請再試一次" }, 409);

    room = await db.prepare("SELECT * FROM rooms WHERE room_id = ?").bind(roomId).first();
    return json({
      color: playerColor(room, token),
      players: players(room),
      revision: room.revision,
      swapped: targetOccupied,
    });
  } catch (error) {
    console.error(error);
    return json({ error: "換邊暫時失敗" }, 500);
  }
}
