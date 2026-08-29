import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createTestHarness } from 'wrangler';

const server = createTestHarness({ workers: [{ configPath: './wrangler.jsonc' }] });
const worker = server.getWorker();
const room = `C${randomUUID().replace(/-/g, '').slice(0, 5)}`.toUpperCase();
const red = randomUUID();
const black = randomUUID();

async function call(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers['X-Player-Token'] = token;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await server.fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  assert.equal(response.ok, true, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const postRoom = (token, body) => call('/api/rooms', { method: 'POST', token, body });

await server.listen();
await worker.applyD1Migrations('DB');
try {
  await postRoom(red, { action: 'join', roomId: room, name: 'Clock Red', preferredColor: 'red' });
  await postRoom(black, { action: 'join', roomId: room, name: 'Clock Black', preferredColor: 'black' });
  await call('/api/clock', { method: 'POST', token: red, body: { roomId: room, action: 'configure', initialMs: 60_000, incrementMs: 1000 } });
  const before = await call(`/api/rooms?room=${room}`, { token: red });
  const moved = await postRoom(red, {
    action: 'move', roomId: room, revision: before.revision,
    state: { lastAction: { from: { x: 0, y: 6 }, to: { x: 0, y: 5 } } },
  });
  assert.equal(moved.state.clock.started, true);
  assert.equal(moved.state.clock.active, 'black');

  const restarted = await postRoom(red, { action: 'restart', roomId: room });
  assert.equal(restarted.state.clock.configured, true);
  assert.equal(restarted.state.clock.initialMs, 60_000);
  assert.equal(restarted.state.clock.incrementMs, 1000);
  assert.equal(restarted.state.clock.redMs, 60_000);
  assert.equal(restarted.state.clock.blackMs, 60_000);
  assert.equal(restarted.state.clock.started, false);
  assert.equal(restarted.state.clock.active, 'red');
  assert.equal(restarted.state.clock.runningSince, null);
  console.log('[clock-v2] restart preserves time control and resets both clocks');
} finally {
  await server.close();
}
