import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const realtime = readFileSync(new URL('../worker/realtime.js', import.meta.url), 'utf8');
const client = readFileSync(new URL('../public/realtime-client.js', import.meta.url), 'utf8');
const wrangler = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const performance = readFileSync(new URL('../public/performance-client.js', import.meta.url), 'utf8');

test('realtime uses Durable Object WebSocket hibernation APIs', () => {
  assert.match(realtime, /acceptWebSocket/);
  assert.match(realtime, /getWebSockets/);
  assert.match(realtime, /webSocketMessage/);
  assert.match(wrangler, /"ROOM_REALTIME"/);
  assert.match(wrangler, /"storage": "sqlite"/);
});

test('websocket URL never includes the player token', () => {
  assert.match(client, /\/api\/realtime\?room=/);
  assert.doesNotMatch(client, /token=/);
});

test('polling remains a slow fallback while websocket is connected', () => {
  assert.match(performance, /realtimeVisibleIntervalMs = 30000/);
  assert.match(performance, /realtimeHiddenIntervalMs = 60000/);
  assert.match(client, /scheduleReconnect/);
});
