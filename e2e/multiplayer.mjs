import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createTestHarness } from "wrangler";

const server = createTestHarness({
  workers: [{ configPath: "./wrangler.jsonc" }],
});
const worker = server.getWorker();

function roomId(prefix) {
  return `${prefix}${randomBytes(4).toString("hex")}`.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

async function request(path, { method = "GET", token, body, expected = 200 } = {}) {
  const headers = {};
  if (token) headers["X-Player-Token"] = token;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await server.fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (response.status !== expected) {
    throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

const postRoom = (token, body, expected = 200) => request("/api/rooms", { method: "POST", token, body, expected });
const getRoom = (token, room) => request(`/api/rooms?room=${encodeURIComponent(room)}`, { token });
const join = (token, room, name, preferredColor, gameVariant = "standard") => postRoom(token, {
  action: "join",
  roomId: room,
  name,
  preferredColor,
  gameVariant,
});

await server.listen();
await worker.applyD1Migrations("DB");

try {
  console.log("[e2e] create room and join from two independent player tokens");
  const matchRoom = roomId("M");
  const redToken = randomUUID();
  const blackToken = randomUUID();
  const redJoin = await join(redToken, matchRoom, "E2E Red", "red");
  assert.equal(redJoin.color, "red");
  const blackJoin = await join(blackToken, matchRoom, "E2E Black", "black");
  assert.equal(blackJoin.color, "black");
  assert.equal(blackJoin.players.length, 2);

  console.log("[e2e] reconnect with header token and synchronize the same room");
  const redBefore = await getRoom(redToken, matchRoom);
  assert.equal(redBefore.color, "red");
  assert.equal(redBefore.state.turn, "red");
  assert.ok(!`/api/rooms?room=${matchRoom}`.includes("token="));

  console.log("[e2e] make a legal move and observe it from the other player");
  const moved = await postRoom(redToken, {
    action: "move",
    roomId: matchRoom,
    revision: redBefore.revision,
    state: {
      lastAction: {
        from: { x: 0, y: 6 },
        to: { x: 0, y: 5 },
      },
    },
  });
  assert.equal(moved.state.turn, "black");
  assert.equal(moved.state.board[5][0]?.c, "red");
  assert.equal(moved.state.board[6][0], null);
  const blackAfter = await getRoom(blackToken, matchRoom);
  assert.equal(blackAfter.revision, moved.revision);
  assert.deepEqual(blackAfter.state.lastAction?.to, { x: 0, y: 5 });

  console.log("[e2e] reject stale revision and side switching after first move");
  await postRoom(blackToken, {
    action: "move",
    roomId: matchRoom,
    revision: redBefore.revision,
    state: {
      lastAction: {
        from: { x: 0, y: 3 },
        to: { x: 0, y: 4 },
      },
    },
  }, 409);
  await request("/api/change-side", {
    method: "POST",
    token: blackToken,
    body: { roomId: matchRoom, color: "red" },
    expected: 409,
  });

  console.log("[e2e] request and accept undo between two players");
  await postRoom(redToken, { action: "request-undo", roomId: matchRoom });
  const undone = await postRoom(blackToken, { action: "respond-undo", roomId: matchRoom, accept: true });
  assert.equal(undone.state.turn, "red");
  assert.equal(undone.state.board[6][0]?.c, "red");
  assert.equal(undone.state.board[5][0], null);

  console.log("[e2e] restart returns the shared room to a fresh opening state");
  const restarted = await postRoom(redToken, { action: "restart", roomId: matchRoom });
  assert.equal(restarted.state.turn, "red");
  assert.equal(restarted.state.winner, null);
  assert.equal(restarted.state.history.length, 0);
  assert.equal(restarted.state.board[6][0]?.t, "P");

  console.log("[e2e] swap two occupied sides before the first move");
  const swapRoom = roomId("S");
  const swapRedToken = randomUUID();
  const swapBlackToken = randomUUID();
  await join(swapRedToken, swapRoom, "Swap A", "red");
  await join(swapBlackToken, swapRoom, "Swap B", "black");
  const swapped = await request("/api/change-side", {
    method: "POST",
    token: swapRedToken,
    body: { roomId: swapRoom, color: "black" },
  });
  assert.equal(swapped.color, "black");
  assert.equal(swapped.swapped, true);
  assert.ok(swapped.players.some((player) => player.name === "Swap A" && player.color === "black"));
  assert.ok(swapped.players.some((player) => player.name === "Swap B" && player.color === "red"));

  console.log("[e2e] Jieqi hides unrevealed identities at the Worker boundary");
  const jieqiRoom = roomId("J");
  const jieqiToken = randomUUID();
  const jieqi = await join(jieqiToken, jieqiRoom, "Jieqi A", "red", "jieqi");
  const covered = jieqi.state.board.flat().filter((piece) => piece?.h && piece.t === "?");
  assert.ok(covered.length > 0, "expected covered Jieqi pieces to be masked");
  assert.equal(jieqi.state.board.flat().some((piece) => piece?.h && piece.t !== "?"), false);

  console.log("[e2e] all multiplayer Worker + D1 scenarios passed");
} catch (error) {
  server.debug();
  throw error;
} finally {
  await server.close();
}
