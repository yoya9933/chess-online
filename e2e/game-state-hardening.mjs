import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createTestHarness } from 'wrangler';

const server = createTestHarness({ workers: [{ configPath: './wrangler.jsonc' }] });
const worker = server.getWorker();

function roomId(prefix) {
  return `${prefix}${randomBytes(4).toString('hex')}`.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

async function request(path, { method = 'GET', token, body, expected = 200 } = {}) {
  const headers = {};
  if (token) headers['X-Player-Token'] = token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await server.fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (response.status !== expected) {
    throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

const postRoom = (token, body, expected = 200) => request('/api/rooms', { method: 'POST', token, body, expected });
const getRoom = (token, room) => request(`/api/rooms?room=${encodeURIComponent(room)}`, { token });
const clock = (token, room, body) => body
  ? request('/api/clock', { method: 'POST', token, body: { roomId: room, ...body } })
  : request(`/api/clock?room=${encodeURIComponent(room)}`, { token });
const adjudicate = (token, room, action, extra = {}) => request('/api/adjudication', {
  method: 'POST', token, body: { roomId: room, action, ...extra },
});
const join = (token, room, name, preferredColor) => postRoom(token, {
  action: 'join', roomId: room, name, preferredColor, gameVariant: 'standard',
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function twoPlayerRoom(prefix) {
  const room = roomId(prefix);
  const red = randomUUID();
  const black = randomUUID();
  await join(red, room, `${prefix} Red`, 'red');
  await join(black, room, `${prefix} Black`, 'black');
  return { room, red, black };
}

async function redPawnMove(red, room) {
  const before = await getRoom(red, room);
  return postRoom(red, {
    action: 'move',
    roomId: room,
    revision: before.revision,
    state: { lastAction: { from: { x: 0, y: 6 }, to: { x: 0, y: 5 } } },
  });
}

await server.listen();
await worker.applyD1Migrations('DB');

try {
  console.log('[hardening] undo + clock keeps elapsed time and resumes the restored side');
  {
    const { room, red, black } = await twoPlayerRoom('U');
    await clock(red, room, { action: 'configure', initialMs: 60_000, incrementMs: 0 });
    const moved = await redPawnMove(red, room);
    assert.equal(moved.state.clock.active, 'black');
    await sleep(25);
    const beforeUndo = await clock(black, room);
    await postRoom(black, { action: 'request-undo', roomId: room });
    await sleep(25);
    const undone = await postRoom(red, { action: 'respond-undo', roomId: room, accept: true });
    assert.equal(undone.state.turn, 'red');
    assert.equal(undone.state.clock.configured, true);
    assert.equal(undone.state.clock.active, 'red');
    assert.ok(undone.state.clock.redMs <= beforeUndo.clock.redMs);
    assert.ok(undone.state.clock.blackMs <= beforeUndo.clock.blackMs, 'undo must not refund waiting time');

    console.log('[hardening] repeated undo cannot go before the opening position');
    await postRoom(red, { action: 'request-undo', roomId: room }, 409);

    console.log('[hardening] reconnect by player token can continue an undo flow');
    await redPawnMove(red, room);
    await postRoom(black, { action: 'request-undo', roomId: room });
    const reconnected = await getRoom(black, room);
    assert.equal(reconnected.color, 'black');
    const secondUndo = await postRoom(red, { action: 'respond-undo', roomId: room, accept: true });
    assert.equal(secondUndo.state.turn, 'red');
    assert.equal(secondUndo.state.clock.active, 'red');
  }

  console.log('[hardening] restart after a clocked game returns a usable fresh game');
  {
    const { room, red } = await twoPlayerRoom('R');
    await clock(red, room, { action: 'configure', initialMs: 60_000, incrementMs: 0 });
    await redPawnMove(red, room);
    const restarted = await postRoom(red, { action: 'restart', roomId: room });
    assert.equal(restarted.state.turn, 'red');
    assert.equal(restarted.state.history.length, 0);
    const reconfigured = await clock(red, room, { action: 'configure', initialMs: 60_000, incrementMs: 1000 });
    assert.equal(reconfigured.clock.configured, true);
    assert.equal(reconfigured.clock.initialMs, 60_000);
  }

  console.log('[hardening] resignation and agreed draw remain compatible with configured clocks');
  {
    const resign = await twoPlayerRoom('Q');
    await clock(resign.red, resign.room, { action: 'configure', initialMs: 60_000, incrementMs: 0 });
    await adjudicate(resign.red, resign.room, 'resign');
    const resigned = await getRoom(resign.black, resign.room);
    assert.equal(resigned.state.result.type, 'resign');
    assert.equal(resigned.state.clock.configured, true);

    const draw = await twoPlayerRoom('D');
    await clock(draw.red, draw.room, { action: 'configure', initialMs: 60_000, incrementMs: 0 });
    await adjudicate(draw.red, draw.room, 'request-draw');
    await adjudicate(draw.black, draw.room, 'respond-draw', { accept: true });
    const drawn = await getRoom(draw.red, draw.room);
    assert.equal(drawn.state.result.type, 'draw-agreed');
    assert.equal(drawn.state.clock.configured, true);
  }

  console.log('[hardening] game-state interaction scenarios passed');
} catch (error) {
  server.debug();
  throw error;
} finally {
  await server.close();
}
